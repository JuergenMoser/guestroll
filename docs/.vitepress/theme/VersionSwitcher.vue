<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'

const { theme, site } = useData()
const route = useRoute()
const docs = computed(() => theme.value.docsVersions as { version: string, latest: string, versions: { version: string, base: string }[] })

function label(version: string): string {
  if (version === 'next') return 'next (develop)'
  return version === docs.value.latest ? `${version} (latest)` : version
}

// Opens the same page in the chosen version, or its home page when that version does not
// have the page.
async function go(event: Event): Promise<void> {
  const target = docs.value.versions.find((v) => v.version === (event.target as HTMLSelectElement).value)
  if (!target) return
  const page = route.path.startsWith(site.value.base) ? route.path.slice(site.value.base.length) : ''
  let url = target.base + page
  try {
    const response = await fetch(url, { method: 'HEAD' })
    if (!response.ok) url = target.base
  } catch {
    url = target.base
  }
  window.location.href = url
}
</script>

<template>
  <label v-if="docs.versions.length > 1" class="docs-version" :title="'Documentation of Guestroll ' + docs.version">
    <span class="visually-hidden">Version</span>
    <select :value="docs.version" @change="go">
      <option v-for="v in docs.versions" :key="v.version" :value="v.version">{{ label(v.version) }}</option>
    </select>
  </label>
</template>

<style scoped>
.docs-version {
  display: flex;
  align-items: center;
  margin-left: 12px;
}

.docs-version select {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 13px;
  font-weight: 500;
  padding: 4px 8px;
  cursor: pointer;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
