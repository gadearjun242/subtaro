import Hero from '@/components/landing/Hero'
import StatsStrip from '@/components/landing/StatsStrip'
import DemoReel from '@/components/landing/DemoReel'
import Features from '@/components/landing/Features'
import SubtitleModesShowcase from '@/components/landing/SubtitleModesShowcase'
import HowItWorks from '@/components/landing/HowItWorks'
import Faq from '@/components/landing/Faq'
import CTA from '@/components/landing/CTA'

export default function Landing() {
  return (
    <>
      <Hero />
      <StatsStrip />
      <DemoReel />
      <Features />
      <SubtitleModesShowcase />
      <HowItWorks />
      <Faq />
      <CTA />
    </>
  )
}
