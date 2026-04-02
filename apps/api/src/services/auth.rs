use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng as AeadOsRng},
    Aes256Gcm,
};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use rand::{distributions::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use totp_rs::{Algorithm as TotpAlgorithm, Secret, TOTP};
use uuid::Uuid;

use crate::error::{AppError, Result};

// ── JWT Claims ────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // user ID
    pub exp: i64,
    pub iat: i64,
}

pub fn generate_access_token(user_id: Uuid, secret: &str, expiry_minutes: i64) -> Result<String> {
    let now = Utc::now();
    let claims = Claims {
        sub: user_id.to_string(),
        iat: now.timestamp(),
        exp: (now + Duration::minutes(expiry_minutes)).timestamp(),
    };

    let token = encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )?;

    Ok(token)
}

pub fn verify_access_token(token: &str, secret: &str) -> Result<Uuid> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;

    let data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )?;

    let user_id = Uuid::parse_str(&data.claims.sub)
        .map_err(|_| AppError::Unauthorized("Invalid token subject".into()))?;

    Ok(user_id)
}

// ── Passwords ─────────────────────────────────────────────────────────────────

pub fn hash_password(password: &str) -> Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Password hashing failed: {}", e)))?
        .to_string();
    Ok(hash)
}

pub fn verify_password(password: &str, hash: &str) -> Result<bool> {
    let parsed_hash = PasswordHash::new(hash)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Invalid password hash: {}", e)))?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

// ── Refresh tokens ────────────────────────────────────────────────────────────

pub fn generate_refresh_token() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(64)
        .map(char::from)
        .collect()
}

pub fn generate_invite_code() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(8)
        .map(char::from)
        .collect()
}

pub fn generate_verification_token() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(32)
        .map(char::from)
        .collect()
}

pub fn generate_discriminator() -> String {
    let n: u16 = rand::thread_rng().gen_range(1..=9999);
    format!("{:04}", n)
}

pub fn generate_totp_secret_base32() -> String {
    Secret::generate_secret().to_encoded().to_string()
}

pub fn verify_totp_code(
    secret_base32: &str,
    code: &str,
    account_name: &str,
    issuer: &str,
) -> Result<bool> {
    let totp = build_totp(secret_base32, account_name, issuer)?;
    totp.check_current(code.trim())
        .map_err(|e| AppError::BadRequest(format!("Invalid two-factor code: {e}")))
}

pub fn build_totp_setup(
    secret_base32: &str,
    account_name: &str,
    issuer: &str,
) -> Result<(String, String)> {
    let totp = build_totp(secret_base32, account_name, issuer)?;
    let qr_base64 = totp
        .get_qr_base64()
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to generate 2FA QR code: {e}")))?;

    Ok((totp.get_url(), format!("data:image/png;base64,{qr_base64}")))
}

pub fn encrypt_sensitive_value(value: &str, master_secret: &str) -> Result<String> {
    let cipher = build_cipher(master_secret);
    let nonce = Aes256Gcm::generate_nonce(&mut AeadOsRng);
    let encrypted = cipher
        .encrypt(&nonce, value.as_bytes())
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to encrypt secret: {e}")))?;

    Ok(format!(
        "{}.{}",
        URL_SAFE_NO_PAD.encode(nonce),
        URL_SAFE_NO_PAD.encode(encrypted)
    ))
}

pub fn decrypt_sensitive_value(value: &str, master_secret: &str) -> Result<String> {
    let (nonce_b64, ciphertext_b64) = value
        .split_once('.')
        .ok_or_else(|| AppError::Internal(anyhow::anyhow!("Invalid encrypted secret format")))?;

    let nonce = URL_SAFE_NO_PAD
        .decode(nonce_b64)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to decode secret nonce: {e}")))?;
    let ciphertext = URL_SAFE_NO_PAD.decode(ciphertext_b64).map_err(|e| {
        AppError::Internal(anyhow::anyhow!("Failed to decode encrypted secret: {e}"))
    })?;

    let cipher = build_cipher(master_secret);
    let decrypted = cipher
        .decrypt(nonce.as_slice().into(), ciphertext.as_ref())
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to decrypt secret: {e}")))?;

    String::from_utf8(decrypted)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Invalid UTF-8 in decrypted secret: {e}")))
}

pub fn generate_backup_codes(count: usize) -> (Vec<String>, Vec<String>) {
    let raw_codes = (0..count)
        .map(|_| {
            let raw: String = rand::thread_rng()
                .sample_iter(&Alphanumeric)
                .take(8)
                .map(char::from)
                .collect();
            let normalized = raw.to_uppercase();
            format!("{}-{}", &normalized[..4], &normalized[4..])
        })
        .collect::<Vec<_>>();

    let hashed_codes = raw_codes
        .iter()
        .map(|code| hash_backup_code(code))
        .collect::<Vec<_>>();

    (raw_codes, hashed_codes)
}

pub fn consume_backup_code(backup_code_hashes: &[String], input: &str) -> Option<Vec<String>> {
    let needle = hash_backup_code(input);
    let position = backup_code_hashes.iter().position(|hash| hash == &needle)?;
    let mut next = backup_code_hashes.to_vec();
    next.remove(position);
    Some(next)
}

fn hash_backup_code(code: &str) -> String {
    let normalized = code
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric())
        .collect::<String>()
        .to_uppercase();
    let mut hasher = Sha256::new();
    hasher.update(normalized.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn build_totp(secret_base32: &str, account_name: &str, issuer: &str) -> Result<TOTP> {
    let secret = Secret::Encoded(secret_base32.to_string())
        .to_bytes()
        .map_err(|e| AppError::BadRequest(format!("Invalid two-factor secret: {e}")))?;

    TOTP::new(
        TotpAlgorithm::SHA1,
        6,
        1,
        30,
        secret,
        Some(issuer.to_string()),
        account_name.to_string(),
    )
    .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to initialize TOTP: {e}")))
}

fn build_cipher(master_secret: &str) -> Aes256Gcm {
    let key_bytes = Sha256::digest(master_secret.as_bytes());
    Aes256Gcm::new_from_slice(&key_bytes).expect("SHA-256 digest should always be 32 bytes")
}
