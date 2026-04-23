const STORAGE_KEY = 'aegis_admin_api_token'

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.sessionStorage
}

export function getAdminApiToken() {
  const storage = getStorage()
  return storage?.getItem(STORAGE_KEY) || ''
}

export function setAdminApiToken(token) {
  const storage = getStorage()
  if (!storage) return
  storage.setItem(STORAGE_KEY, token.trim())
}

export function clearAdminApiToken() {
  const storage = getStorage()
  if (!storage) return
  storage.removeItem(STORAGE_KEY)
}
