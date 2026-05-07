import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';

const About = lazy(() => import('./pages/About'));

function App() {
    return (
        <BrowserRouter>
            <div>
                <nav style={{ 
                    padding: '10px', 
                    backgroundColor: '#f0f0f0',
                    marginBottom: '20px'
                }}>
                    <Link to="/" style={{ marginRight: '10px' }}>Главная</Link>
                    <Link to="/about">О нас</Link>
                </nav>

                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={
                        <Suspense fallback={<div>Загрузка страницы О нас...</div>}>
                            <About />
                        </Suspense>
                    } />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;