import { Outlet } from 'react-router-dom';
import { Nav } from '@/components/Nav';

function App() {
  return (
    <div className="min-h-dvh flex flex-col">
      <Nav />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
