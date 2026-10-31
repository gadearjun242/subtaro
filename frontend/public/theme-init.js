try {
  const savedTheme = localStorage.getItem('theme')
  const isLight = savedTheme === 'light'
  document.documentElement.classList.toggle('dark', !isLight)
  document.documentElement.style.colorScheme = isLight ? 'light' : 'dark'
} catch {
  document.documentElement.classList.add('dark')
  document.documentElement.style.colorScheme = 'dark'
}
