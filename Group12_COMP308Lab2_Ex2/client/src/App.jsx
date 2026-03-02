import React, { useState, useEffect, useRef } from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider, useQuery, useLazyQuery, useMutation, gql, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import * as THREE from 'three';
import 'bootstrap/dist/css/bootstrap.min.css';

const httpLink = createHttpLink({ uri: 'http://localhost:4000/graphql' });
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return { headers: { ...headers, authorization: token ? `Bearer ${token}` : "" } };
});
const client = new ApolloClient({ link: authLink.concat(httpLink), cache: new InMemoryCache() });

const LOGIN = gql`query Login($email: String!, $password: String!) { login(email: $email, password: $password) { token } }`;
const CREATE_PLAYER = gql`mutation CreatePlayer($playerId: String!, $username: String!, $email: String!, $password: String!) { createPlayer(playerId: $playerId, username: $username, email: $email, password: $password) { _id } }`;
const CREATE_GAME = gql`mutation CreateGame($gameId: String!, $title: String!, $genre: String!, $platform: String!, $releaseYear: Int!) { createGame(gameId: $gameId, title: $title, genre: $genre, platform: $platform, releaseYear: $releaseYear) { _id } }`;
const GET_GAMES = gql`query { getAllGames { _id title genre platform releaseYear } }`;
const GET_PROFILE = gql`query { getPlayerProfile { username avatarImage favoriteGames { _id title genre platform releaseYear } } }`;
const ADD_FAVORITE = gql`mutation AddFav($gameId: ID!) { addFavoriteGame(gameId: $gameId) { _id } }`;
const REMOVE_FAVORITE = gql`mutation RemoveFav($gameId: ID!) { removeFavoriteGame(gameId: $gameId) { _id } }`;
const UPDATE_AVATAR = gql`mutation UpdateAvatar($avatarImage: String!) { updatePlayerProfile(avatarImage: $avatarImage) { avatarImage } }`;

// Fondo 3D Interactivo Arreglado
const Background3D = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (mountRef.current) mountRef.current.innerHTML = '';
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true }); // alpha: false para que pinte su propio fondo
    
    renderer.setClearColor('#0a0a0a'); // Este es el color oscuro del fondo
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 2000;
    const posArray = new Float32Array(particlesCount * 3);

    for(let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 15;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.005,
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.8
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);
    camera.position.z = 3;

    const animate = () => {
      requestAnimationFrame(animate);
      particlesMesh.rotation.y += 0.001;
      particlesMesh.rotation.x += 0.0005;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, []);

  return <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }}></div>;
};

// Avatar 3D Opción 3: Icosaedro (Estilo Cristal/D20)
const Avatar3D = () => {
  const mountRef = useRef(null);
  
  useEffect(() => {
    if (mountRef.current) mountRef.current.innerHTML = '';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(150, 150);
    mountRef.current.appendChild(renderer.domElement);
    
    // Geometría de Icosaedro (parece un cristal o dado de rol)
    const geometry = new THREE.IcosahedronGeometry(1, 0);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true });
    const icosahedron = new THREE.Mesh(geometry, material);
    scene.add(icosahedron);
    camera.position.z = 2.5;

    const animate = () => {
      requestAnimationFrame(animate);
      icosahedron.rotation.x += 0.005;
      icosahedron.rotation.y += 0.01;
      renderer.render(scene, camera);
    };
    animate();

    const handleClick = () => {
      icosahedron.material.color.setHex(Math.random() * 0xffffff);
    };
    renderer.domElement.addEventListener('click', handleClick);

    return () => {
      renderer.domElement.removeEventListener('click', handleClick);
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, []);

  return (
    <div className="mx-auto mb-3" style={{ cursor: 'pointer', position: 'relative', zIndex: 2 }}>
      <div ref={mountRef} style={{ width: '150px', height: '150px', margin: '0 auto' }}></div>
      <p className="text-secondary small mb-0">Click the 3D Avatar to change color!</p>
    </div>
  );
};

function GameApp() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [view, setView] = useState(token ? 'library' : 'login');
  
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [playerId, setPlayerId] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');

  const [gameForm, setGameForm] = useState({ gameId: '', title: '', genre: '', platform: '', releaseYear: '' });
  
  const { data: gamesData, refetch: refetchGames } = useQuery(GET_GAMES, { skip: !token });
  const { data: profileData, refetch: refetchProfile } = useQuery(GET_PROFILE, { skip: !token });
  
  const [login] = useLazyQuery(LOGIN);
  const [createPlayer] = useMutation(CREATE_PLAYER);
  const [createGame] = useMutation(CREATE_GAME, { onCompleted: () => { alert('Game Added to Database!'); refetchGames(); setView('library'); } });
  const [addFavorite] = useMutation(ADD_FAVORITE, { onCompleted: () => { alert('Added to Favorites!'); refetchProfile(); } });
  const [removeFavorite] = useMutation(REMOVE_FAVORITE, { onCompleted: () => refetchProfile() });
  const [updateAvatar] = useMutation(UPDATE_AVATAR, { onCompleted: () => { alert('Avatar Updated!'); refetchProfile(); setAvatarUrl(''); } });

  const handleAuth = async (e) => {
    e.preventDefault();
    if (isLoginView) {
      try {
        const { data } = await login({ variables: { email, password } });
        localStorage.setItem('token', data.login.token);
        setToken(data.login.token);
        setView('library');
      } catch (err) { alert('Error: Verifica tus credenciales.'); }
    } else {
      try {
        await createPlayer({ variables: { playerId, username, email, password } });
        alert('Account created! You can now log in.');
        setIsLoginView(true);
      } catch (err) { alert('Error: El usuario o email ya existe.'); }
    }
  };

  const handleAddGame = (e) => {
    e.preventDefault();
    createGame({ variables: { ...gameForm, releaseYear: parseInt(gameForm.releaseYear) } });
    setGameForm({ gameId: '', title: '', genre: '', platform: '', releaseYear: '' });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setView('login');
  };

  const filteredGames = gamesData?.getAllGames.filter(game => 
    game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    game.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    game.platform.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!token) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100vw', position: 'relative' }}>
      <style>{`body, html { margin: 0; padding: 0; background-color: #0a0a0a; width: 100%; height: 100%; }`}</style>
      <Background3D />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px' }}>
        <div className="card text-white p-5 rounded-4 shadow-lg border-secondary text-center" style={{ backgroundColor: 'rgba(30, 30, 30, 0.7)', backdropFilter: 'blur(10px)' }}>
          <h2 className="text-info fw-bold mb-4">{isLoginView ? 'Player Login' : 'Sign Up'}</h2>
          <form onSubmit={handleAuth}>
            {!isLoginView && (
              <>
                <div className="mb-3 text-start">
                  <label className="form-label text-secondary small fw-bold">Player ID</label>
                  <input className="form-control text-center bg-dark text-white border-secondary" value={playerId} onChange={e => setPlayerId(e.target.value)} required />
                </div>
                <div className="mb-3 text-start">
                  <label className="form-label text-secondary small fw-bold">Username</label>
                  <input className="form-control text-center bg-dark text-white border-secondary" value={username} onChange={e => setUsername(e.target.value)} required />
                </div>
              </>
            )}
            <div className="mb-3 text-start">
              <label className="form-label text-secondary small fw-bold">Email</label>
              <input className="form-control text-center bg-dark text-white border-secondary" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="mb-4 text-start">
              <label className="form-label text-secondary small fw-bold">Password</label>
              <input className="form-control text-center bg-dark text-white border-secondary" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="btn btn-info w-100 rounded-pill fw-bold mb-3">{isLoginView ? 'Enter the Game' : 'Create Account'}</button>
          </form>
          <button className="btn btn-link text-secondary text-decoration-none" onClick={() => setIsLoginView(!isLoginView)}>
            {isLoginView ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', width: '100vw', fontFamily: "'Inter', sans-serif", color: '#e0e0e0', overflowX: 'hidden', position: 'relative' }}>
      <style>{`body, html { margin: 0; padding: 0; background-color: #0a0a0a; width: 100%; height: 100%; }`}</style>
      <Background3D />
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <nav className="navbar navbar-dark w-100 d-flex justify-content-center border-bottom border-secondary mb-4 py-3" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }}>
          <div className="d-flex gap-4">
            <button className={`btn btn-link text-decoration-none fw-bold fs-5 ${view === 'library' ? 'text-info' : 'text-secondary'}`} onClick={() => { setView('library'); setSelectedGame(null); }}>Game Library</button>
            <button className={`btn btn-link text-decoration-none fw-bold fs-5 ${view === 'addGame' ? 'text-info' : 'text-secondary'}`} onClick={() => { setView('addGame'); setSelectedGame(null); }}>Add New Game</button>
            <button className={`btn btn-link text-decoration-none fw-bold fs-5 ${view === 'profile' ? 'text-info' : 'text-secondary'}`} onClick={() => { setView('profile'); setSelectedGame(null); }}>My Profile</button>
            <button className="btn btn-outline-danger rounded-pill px-4 ms-3" onClick={logout}>Logout</button>
          </div>
        </nav>

        <div className="container d-flex flex-column align-items-center">
          
          {selectedGame && (
            <div className="card border-info rounded-4 p-4 text-center w-100 mb-4 shadow-lg" style={{ maxWidth: '600px', backgroundColor: 'rgba(30, 30, 30, 0.85)', backdropFilter: 'blur(10px)' }}>
              <h3 className="text-info fw-bold">{selectedGame.title}</h3>
              <div className="d-flex justify-content-around mt-3 mb-4 text-white">
                <div><strong className="text-secondary">Genre:</strong><br/>{selectedGame.genre}</div>
                <div><strong className="text-secondary">Platform:</strong><br/>{selectedGame.platform}</div>
                <div><strong className="text-secondary">Release Year:</strong><br/>{selectedGame.releaseYear}</div>
              </div>
              <button className="btn btn-outline-info rounded-pill w-50 mx-auto" onClick={() => setSelectedGame(null)}>Close Details</button>
            </div>
          )}

          {view === 'library' && !selectedGame && (
            <div className="w-100 text-center" style={{ maxWidth: '800px' }}>
              <h2 className="text-white fw-bold mb-4">Available Games</h2>
              <div className="mb-4 text-start w-100">
                <label className="form-label text-secondary small fw-bold ms-3">Search Library</label>
                <input 
                  className="form-control bg-dark text-white border-info text-center rounded-pill" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
              </div>
              <div className="list-group">
                {filteredGames?.length === 0 ? <p className="text-secondary">No games found.</p> : null}
                {filteredGames?.map(game => (
                  <div key={game._id} className="list-group-item text-white border-secondary d-flex justify-content-between align-items-center mb-2 rounded shadow-sm" style={{ backgroundColor: 'rgba(30, 30, 30, 0.7)', backdropFilter: 'blur(5px)' }}>
                    <div className="text-start">
                      <span className="fw-bold fs-5">{game.title}</span><br/>
                      <small className="text-secondary">{game.genre} | {game.platform}</small>
                    </div>
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-outline-light rounded-pill" onClick={() => setSelectedGame(game)}>Details</button>
                      <button className="btn btn-sm btn-info rounded-pill fw-bold text-dark" onClick={() => addFavorite({ variables: { gameId: game._id } })}>+ Favorite</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'addGame' && !selectedGame && (
            <div className="card border-secondary rounded-4 p-5 text-center w-100 shadow-lg" style={{ maxWidth: '600px', backgroundColor: 'rgba(30, 30, 30, 0.85)', backdropFilter: 'blur(10px)' }}>
              <h2 className="text-white fw-bold mb-4">Add Game to Database</h2>
              <form onSubmit={handleAddGame}>
                <div className="mb-3 text-start">
                  <label className="form-label text-secondary small fw-bold">Game ID</label>
                  <input className="form-control bg-dark text-white border-secondary" value={gameForm.gameId} onChange={e => setGameForm({...gameForm, gameId: e.target.value})} required placeholder="G123" />
                </div>
                <div className="mb-3 text-start">
                  <label className="form-label text-secondary small fw-bold">Title</label>
                  <input className="form-control bg-dark text-white border-secondary" value={gameForm.title} onChange={e => setGameForm({...gameForm, title: e.target.value})} required placeholder="The Legend of Zelda" />
                </div>
                <div className="row mb-3">
                  <div className="col-md-6 text-start">
                    <label className="form-label text-secondary small fw-bold">Genre</label>
                    <input className="form-control bg-dark text-white border-secondary" value={gameForm.genre} onChange={e => setGameForm({...gameForm, genre: e.target.value})} required placeholder="Action-Adventure" />
                  </div>
                  <div className="col-md-6 text-start">
                    <label className="form-label text-secondary small fw-bold">Platform</label>
                    <input className="form-control bg-dark text-white border-secondary" value={gameForm.platform} onChange={e => setGameForm({...gameForm, platform: e.target.value})} required placeholder="Nintendo Switch" />
                  </div>
                </div>
                <div className="mb-4 text-start">
                  <label className="form-label text-secondary small fw-bold">Release Year</label>
                  <input className="form-control bg-dark text-white border-secondary" type="number" value={gameForm.releaseYear} onChange={e => setGameForm({...gameForm, releaseYear: e.target.value})} required placeholder="2017" />
                </div>
                <button type="submit" className="btn btn-info w-100 rounded-pill fw-bold text-dark">Save Game</button>
              </form>
            </div>
          )}

          {view === 'profile' && !selectedGame && profileData && (
            <div className="card border-secondary rounded-4 p-5 text-center w-100 shadow-lg" style={{ maxWidth: '600px', backgroundColor: 'rgba(30, 30, 30, 0.85)', backdropFilter: 'blur(10px)' }}>
              <h2 className="text-white fw-bold">Player Profile</h2>
              <h4 className="text-info mb-4">@{profileData.getPlayerProfile.username}</h4>
              
              <Avatar3D />
              
              <div className="mb-4 w-100 text-start">
                <label className="form-label text-secondary small fw-bold">Update Avatar URL</label>
                <div className="input-group">
                  <input className="form-control bg-dark text-white border-secondary" placeholder="Paste image URL here" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
                  <button className="btn btn-info fw-bold" onClick={() => updateAvatar({ variables: { avatarImage: avatarUrl } })}>Update</button>
                </div>
              </div>
              
              <h4 className="mt-4 text-white border-bottom border-secondary pb-2">My Favorite Games</h4>
              <ul className="list-group mt-3">
                {profileData.getPlayerProfile.favoriteGames.length === 0 && <p className="text-secondary">Your favorite list is empty.</p>}
                {profileData.getPlayerProfile.favoriteGames.map(game => (
                  <li key={game._id} className="list-group-item text-white border-secondary d-flex justify-content-between align-items-center" style={{ backgroundColor: 'rgba(30, 30, 30, 0.5)' }}>
                    <span>{game.title}</span>
                    <button className="btn btn-sm btn-danger rounded-pill" onClick={() => removeFavorite({ variables: { gameId: game._id } })}>Remove</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <ApolloProvider client={client}><GameApp /></ApolloProvider>;
}