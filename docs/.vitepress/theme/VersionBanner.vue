<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useData } from 'vitepress'
import { langDir, strings } from './strings'

const { theme, lang } = useData()
const t = computed(() => strings(lang.value))
const docs = computed(() => theme.value.docsVersions as { version: string, latest: string, versions: { version: string, base: string }[] })
// the latest docs in the same language: every release since the translations has them
const latestBase = computed(() => (docs.value.versions.find((v) => v.version === docs.value.latest)?.base ?? '/guestroll/') + langDir(lang.value))
const changes = computed(() => docs.value.version === 'next'
  ? `https://github.com/achedon12/guestroll/compare/${docs.value.latest}...develop`
  : `https://github.com/achedon12/guestroll/compare/${docs.value.version}...${docs.value.latest}`)

// the navigation bar is fixed: tell the theme how much room the banner takes above it
const banner = ref<HTMLElement | null>(null)
let observer: ResizeObserver | null = null
onMounted(() => {
  if (!banner.value) return
  const update = () => document.documentElement.style.setProperty('--vp-layout-top-height', `${banner.value?.offsetHeight ?? 0}px`)
  observer = new ResizeObserver(update)
  observer.observe(banner.value)
  update()
})
onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div v-if="docs.version !== docs.latest" ref="banner" class="docs-banner">
    <template v-if="docs.version === 'next'">{{ t.next }}</template>
    <template v-else>{{ t.old(docs.version, docs.latest) }}</template>
    <a :href="latestBase" target="_self">{{ t.latestDocs }}</a>
    ·
    <a :href="changes" target="_blank" rel="noreferrer">{{ t.changes }}</a>
    ·
    <a href="https://github.com/achedon12/guestroll/blob/develop/CHANGELOG.md" target="_blank" rel="noreferrer">{{ t.changelog }}</a>
  </div>
</template>

<style scoped>
.docs-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  padding: 8px 24px;
  background: var(--vp-c-warning-soft);
  color: var(--vp-c-text-1);
  font-size: 14px;
  text-align: center;
}

.docs-banner a {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  text-decoration: underline;
}
</style>
