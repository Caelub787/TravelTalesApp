import { Href, Link } from 'expo-router';
import { type ComponentProps } from 'react';

import { useArticleViewer } from '@/hooks/use-article-viewer';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: Href & string; title?: string };

// Always opens through useArticleViewer — an in-app modal on web, expo-web-browser's
// in-app sheet on native — so tapping a source never takes the user out of the app.
export function ExternalLink({ href, title, ...rest }: Props) {
  const { open } = useArticleViewer();

  return (
    <Link
      {...rest}
      href={href}
      onPress={(event) => {
        event.preventDefault();
        open(href, title);
      }}
    />
  );
}
