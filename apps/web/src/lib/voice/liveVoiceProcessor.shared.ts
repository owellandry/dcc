import { createDistortionCurve, getResolvedVoiceFilterConfig, type VoiceFilterSettings } from './voiceFilters.shared'

interface VoiceProcessorGraph {
  context: AudioContext
  source: MediaStreamAudioSourceNode
  destination: MediaStreamAudioDestinationNode
  inputGain: GainNode
  dryGain: GainNode
  wetGain: GainNode
  outputGain: GainNode
  highPass: BiquadFilterNode
  lowShelf: BiquadFilterNode
  presence: BiquadFilterNode
  highShelf: BiquadFilterNode
  lowPass: BiquadFilterNode
  distortion: WaveShaperNode
  compressor: DynamicsCompressorNode
}

export class LiveVoiceProcessor {
  private graph: VoiceProcessorGraph | null = null
  private sourceStream: MediaStream | null = null
  private outputStream: MediaStream | null = null
  private lastSettings: VoiceFilterSettings = {
    profile: 'natural',
    tone: 0,
    effectMix: 60,
    inputVolume: 100,
  }

  async attachSource(stream: MediaStream) {
    this.sourceStream = stream

    if (!isVoiceProcessingSupported()) {
      this.outputStream = stream
      return stream
    }

    if (this.graph && this.sourceStream === stream && this.outputStream) {
      this.updateSettings(this.lastSettings)
      return this.outputStream
    }

    this.dispose()

    const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) {
      this.outputStream = stream
      return stream
    }

    const context = new AudioContextCtor({ latencyHint: 'interactive' })
    const source = context.createMediaStreamSource(stream)
    const destination = context.createMediaStreamDestination()
    const inputGain = context.createGain()
    const dryGain = context.createGain()
    const wetGain = context.createGain()
    const outputGain = context.createGain()
    const highPass = context.createBiquadFilter()
    const lowShelf = context.createBiquadFilter()
    const presence = context.createBiquadFilter()
    const highShelf = context.createBiquadFilter()
    const lowPass = context.createBiquadFilter()
    const distortion = context.createWaveShaper()
    const compressor = context.createDynamicsCompressor()

    highPass.type = 'highpass'
    lowShelf.type = 'lowshelf'
    presence.type = 'peaking'
    highShelf.type = 'highshelf'
    lowPass.type = 'lowpass'
    presence.Q.value = 0.9
    distortion.oversample = '4x'
    compressor.threshold.value = -24
    compressor.knee.value = 24
    compressor.ratio.value = 3.5
    compressor.attack.value = 0.003
    compressor.release.value = 0.18

    source.connect(dryGain)
    dryGain.connect(outputGain)

    source.connect(inputGain)
    inputGain.connect(highPass)
    highPass.connect(lowShelf)
    lowShelf.connect(presence)
    presence.connect(highShelf)
    highShelf.connect(lowPass)
    lowPass.connect(distortion)
    distortion.connect(compressor)
    compressor.connect(wetGain)
    wetGain.connect(outputGain)
    outputGain.connect(destination)

    this.graph = {
      context,
      source,
      destination,
      inputGain,
      dryGain,
      wetGain,
      outputGain,
      highPass,
      lowShelf,
      presence,
      highShelf,
      lowPass,
      distortion,
      compressor,
    }

    this.outputStream = destination.stream

    if (context.state === 'suspended') {
      await context.resume().catch(() => undefined)
    }

    this.updateSettings(this.lastSettings)
    return this.outputStream
  }

  updateSettings(settings: VoiceFilterSettings) {
    this.lastSettings = settings
    if (!this.graph) return

    const resolved = getResolvedVoiceFilterConfig(settings)

    this.graph.inputGain.gain.value = 1
    this.graph.dryGain.gain.value = resolved.dryGain
    this.graph.wetGain.gain.value = resolved.wetGain
    this.graph.outputGain.gain.value = resolved.outputGain
    this.graph.highPass.frequency.value = resolved.highPassHz
    this.graph.lowPass.frequency.value = resolved.lowPassHz
    this.graph.lowShelf.frequency.value = 210
    this.graph.lowShelf.gain.value = resolved.lowShelfGain
    this.graph.presence.frequency.value = resolved.presenceFrequencyHz
    this.graph.presence.gain.value = resolved.presenceGain
    this.graph.highShelf.frequency.value = 3_400
    this.graph.highShelf.gain.value = resolved.highShelfGain
    this.graph.distortion.curve = createDistortionCurve(resolved.distortionAmount)
  }

  getOutputStream() {
    return this.outputStream
  }

  dispose() {
    if (!this.graph) {
      this.outputStream = null
      this.sourceStream = null
      return
    }

    this.graph.source.disconnect()
    this.graph.dryGain.disconnect()
    this.graph.inputGain.disconnect()
    this.graph.highPass.disconnect()
    this.graph.lowShelf.disconnect()
    this.graph.presence.disconnect()
    this.graph.highShelf.disconnect()
    this.graph.lowPass.disconnect()
    this.graph.distortion.disconnect()
    this.graph.compressor.disconnect()
    this.graph.wetGain.disconnect()
    this.graph.outputGain.disconnect()
    void this.graph.context.close().catch(() => undefined)

    this.graph = null
    this.outputStream = null
    this.sourceStream = null
  }
}

function isVoiceProcessingSupported() {
  if (typeof window === 'undefined') return false
  return Boolean(window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
}
