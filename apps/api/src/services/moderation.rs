//! Content moderation service
//! Provides basic content filtering (profanity, banned links, etc.)

use regex::Regex;
use std::sync::LazyLock;

/// Lista básica de palabras prohibidas (se puede mover a BD o archivo de configuración)
const PROFANITY_WORDS: &[&str] = &[
    "palabra1",
    "palabra2",
    "testbadword", // TODO: completar con lista real
];

/// Regex para detectar URLs (simple)
static URL_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(https?://[^\s]+|www\.[^\s]+)").unwrap());

/// Malicious domains blocklist (podría cargarse desde DB o archivo)
const BLOCKED_DOMAINS: &[&str] = &[
    "malicious.com",
    "spam.net",
    // TODO: completar
];

/// Check if message contains profanity
pub fn contains_profanity(text: &str) -> bool {
    let lower_text = text.to_lowercase();
    for word in PROFANITY_WORDS {
        if lower_text.contains(word) {
            return true;
        }
    }
    false
}

/// Extract URLs from text
pub fn extract_urls(text: &str) -> Vec<&str> {
    URL_REGEX.find_iter(text).map(|m| m.as_str()).collect()
}

/// Check if a URL is from a blocked domain
pub fn is_blocked_url(url: &str) -> bool {
    for domain in BLOCKED_DOMAINS {
        if url.contains(domain) {
            return true;
        }
    }
    false
}

/// Censura palabras profanas reemplazando con asteriscos.
#[cfg(test)]
fn censor_profanity(text: &str) -> String {
    let mut result = text.to_string();
    for word in PROFANITY_WORDS {
        let pattern = regex::Regex::new(&format!(r"(?i)\b{}\b", regex::escape(word))).unwrap();
        result = pattern
            .replace_all(&result, "*".repeat(word.len()))
            .to_string();
    }
    result
}

/// Valida un mensaje y devuelve una lista de violaciones
#[derive(Debug, Clone)]
pub struct ValidationViolation {
    pub reason: String,
    pub field: String,
}

/// Validar contenido de mensaje (políticas de moderación)
/// Retorna `Ok(())` si pasa, `Err(violations)` si falla
/// NOTA: no verifica longitud; ese control lo hace el handler.
pub fn validate_message_content(content: &str) -> Result<(), Vec<ValidationViolation>> {
    let mut violations = Vec::new();

    if contains_profanity(content) {
        violations.push(ValidationViolation {
            field: "content".to_string(),
            reason: "Message contains prohibited language".to_string(),
        });
    }

    let urls = extract_urls(content);
    for url in urls {
        if is_blocked_url(url) {
            violations.push(ValidationViolation {
                field: "content".to_string(),
                reason: format!("Link to blocked domain: {}", url),
            });
        }
    }

    if violations.is_empty() {
        Ok(())
    } else {
        Err(violations)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_profanity_detection() {
        assert!(contains_profanity("This is a testbadword message"));
        assert!(!contains_profanity("Hello world"));
    }

    #[test]
    fn test_url_extraction() {
        let urls = extract_urls("Check https://example.com and www.test.com");
        assert_eq!(urls.len(), 2);
        assert!(urls.contains(&"https://example.com"));
        assert!(urls.contains(&"www.test.com"));
    }

    #[test]
    fn test_censor() {
        let censored = censor_profanity("This is a testbadword");
        assert!(censored.contains("******")); // Assuming '*'.repeat(word.len())
    }
}
