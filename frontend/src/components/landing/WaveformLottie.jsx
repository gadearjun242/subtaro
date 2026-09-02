import waveformAnimation from '@/assets/waveform.lottie.json'
import Lottie  from 'lottie-react'

const LottieComponent = Lottie.default

export default function WaveformLottie({ className }) {
  return (
    <LottieComponent
      animationData={waveformAnimation}
      loop
      autoplay
      className={className}
      rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
    />
  )
}
