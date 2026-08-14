const icons = import.meta.glob('./assets/icons/*.png', { eager: true, as: 'url' });

export function iconUrl(iconPath?: string): string | null {
  if (!iconPath) {
    return null;
  }
  const basename = iconPath.replace(/^assets\/icons\//, '');
  return icons[`./assets/icons/${basename}`] ?? null;
}
