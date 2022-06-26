import type { NextPage } from 'next';

import { Layout } from 'components/Layout';
import { GameBoard } from 'components/GameBoard';

const Home: NextPage = () => {
  return (
    <Layout>
      <div
        className="mx-auto w-full px-20 py-16"
        style={{ maxWidth: '100rem' }}
      >
        <h1 className="mb-16 text-center text-5xl font-bold">Wordle</h1>

        <div className="flex flex-col items-center justify-center">
          <GameBoard />
        </div>
      </div>
    </Layout>
  );
};

export default Home;
