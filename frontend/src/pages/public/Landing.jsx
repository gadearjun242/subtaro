import Hero from '@/components/landing/Hero'
import DemoReel from '@/components/landing/DemoReel'
import Features from '@/components/landing/Features'
import CaptionStyles from '@/components/landing/CaptionStyles'
import StudioShowcase from '@/components/landing/StudioShowcase'
import SubtitleModesShowcase from '@/components/landing/SubtitleModesShowcase'
import PricingTeaser from '@/components/landing/PricingTeaser'
import Faq from '@/components/landing/Faq'
import CTA from '@/components/landing/CTA'

export default function Landing() {
  return (
    <>
      <Hero />
      <DemoReel />
      <Features />
      <CaptionStyles />
      <StudioShowcase />
      <SubtitleModesShowcase />
      <PricingTeaser />
      <Faq />
      <CTA />
    </>
  )
}
