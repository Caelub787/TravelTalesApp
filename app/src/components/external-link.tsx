import { Href, Link } from 'expo-router';
import { type ComponentProps } from 'react';

import { useArticleViewer } from '@/hooks/use-article-viewer';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: Href & string; title?: string };

// Always opens through useArticleViewer's themed in-app modal (web and native alike), so
// tapping a source never takes the user out of the app.
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
