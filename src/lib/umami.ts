// Statistik (Umami): Events und Popups als eigene Seiten zählen.
// Das Umami-Script lädt erst nach den Seitenskripten, darum notfalls bis zum load-Event warten.
const send = (payload: unknown) => {
  const go = () => (window as any).umami?.track(payload);
  if ((window as any).umami) go();
  else window.addEventListener('load', go, { once: true });
};

export const track = (name: string) => send(name);
export const trackPage = (url: string, title: string) => send((props: object) => ({ ...props, url, title }));
