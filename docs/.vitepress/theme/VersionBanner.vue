<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useData } from 'vitepress'

const { theme } = useData()
const docs = computed(() => theme.value.docsVersions as { version: string, latest: string, versions: { version: string, base: string }[] })
const latestBase = computed(() => docs.value.versions.find((v) => v.version === docs.value.latest)?.base ?? '/guestroll/')
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
    <template v-if="docs.version === 'next'">
      You are reading the documentation of the next version of Guestroll, not released yet.
    </template>
    <template v-else>
      You are reading the documentation of Guestroll {{ docs.version }}. The latest version is {{ docs.latest }}.
    </template>
    <a :href="latestBase" target="_self">Latest docs</a>
    ·
    <a :href="changes" target="_blank" rel="noreferrer">What changed</a>
    ·
    <a href="https://github.com/achedon12/guestroll/blob/develop/CHANGELOG.md" target="_blank" rel="noreferrer">Changelog</a>
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
