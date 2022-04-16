import NextLink from 'next/link';

export const Link: React.FC<
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: React.ReactNode;
    href: string;
  }
> = ({ href, children, ...rest }) => {
  return (
    <NextLink href={href}>
      <a {...rest}>{children}</a>
    </NextLink>
  );
};
