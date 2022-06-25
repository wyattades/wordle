// import { Link } from 'components/Link';

// const Header: React.FC = () => {
//   return (
//     <nav className="flex h-24 w-full items-center justify-center border-b">
//       <Link
//         href="/"
//         className="px-4 py-2 rounded-md hover:bg-gray-100 transition-colors"
//       >
//         Home
//       </Link>
//     </nav>
//   );
// };

const Footer: React.FC = () => {
  return (
    <footer className="flex h-24 w-full items-center justify-center border-t">
      <span>
        Created with ♥ by{' '}
        <a className="link" href="https://wyattades.com">
          wyattades
        </a>
        .{' '}
        <a className="link" href="https://github.com/github/wyattades">
          View source
        </a>
      </span>
    </footer>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div className="flex min-h-screen flex-col">
      {/* <Header /> */}
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};
