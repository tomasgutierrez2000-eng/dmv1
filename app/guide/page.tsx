import GuideLayout from '@/components/guide/GuideLayout'
import {
  S01_WhatThisPlatformDoes,
  S02_TheBigPicture,
  S03_DataLayers,
  S04_SQLFiles,
  S05_MetricsSystem,
  S06_CodeOrganization,
  S07_APILayer,
  S08_DashboardUI,
  S09_Recipes,
  S10_Glossary,
} from '@/components/guide/sections'

export const metadata = {
  title: 'Team Playbook — Bank Data Model Platform',
  description: 'End-to-end guide for understanding and extending the credit risk data platform.',
}

export default function GuidePage() {
  return (
    <GuideLayout>
      <S01_WhatThisPlatformDoes />
      <S02_TheBigPicture />
      <S03_DataLayers />
      <S04_SQLFiles />
      <S05_MetricsSystem />
      <S06_CodeOrganization />
      <S07_APILayer />
      <S08_DashboardUI />
      <S09_Recipes />
      <S10_Glossary />
    </GuideLayout>
  )
}
