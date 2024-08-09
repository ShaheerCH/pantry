'use client'
import { useState, useEffect, useReducer } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { Box, Typography, Button, Modal, TextField, Stack, CircularProgress, IconButton, Snackbar, Alert, Tooltip, ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { collection, getDocs, query, doc, getDoc, setDoc, deleteDoc, where } from "firebase/firestore";
import { firestore, auth } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import "@fontsource/roboto"; // Add your custom font

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

const initialState = {
  inventory: [],
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_INIT':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, inventory: action.payload };
    case 'FETCH_FAILURE':
      return { ...state, loading: false, error: action.error };
    case 'ADD_ITEM':
      return { ...state, inventory: [...state.inventory, action.payload] };
    case 'REMOVE_ITEM':
      return { ...state, inventory: state.inventory.filter(item => item.name !== action.payload) };
    case 'REORDER_ITEMS':
      return { ...state, inventory: action.payload };
    default:
      throw new Error();
  }
}

function SpinningCube() {
  return (
    <mesh rotation={[90, 0, 20]}>
      <boxGeometry args={[3, 3, 3]} />
      <meshStandardMaterial color={'#1DB954'} />
    </mesh>
  );
}

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { inventory, loading, error } = state;
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: '' });
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [loginMode, setLoginMode] = useState(true); // true for login, false for signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const updateInventory = async () => {
    if (!user) return;
    dispatch({ type: 'FETCH_INIT' });
    try {
      const snapshot = query(collection(firestore, 'inventory'), where('userId', '==', user.uid));
      const docs = await getDocs(snapshot);
      const inventoryList = docs.docs.map(doc => ({ name: doc.id, ...doc.data() }));
      dispatch({ type: 'FETCH_SUCCESS', payload: inventoryList });
    } catch (error) {
      dispatch({ type: 'FETCH_FAILURE', error });
    }
  };

  const addItem = async (item) => {
    if (!user) return;
    try {
      const docRef = doc(collection(firestore, 'inventory'), item);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const { quantity } = docSnap.data();
        await setDoc(docRef, { quantity: quantity + 1, userId: user.uid });
      } else {
        await setDoc(docRef, { quantity: 1, userId: user.uid });
      }
      dispatch({ type: 'ADD_ITEM', payload: { name: item, quantity: 1, userId: user.uid } });
      setSnackbar({ open: true, message: 'Item added successfully!', severity: 'success' });
      updateInventory();
    } catch (error) {
      setSnackbar({ open: true, message: 'Error adding item!', severity: 'error' });
      console.error(error);
    }
  };

  const removeItem = async (item) => {
    if (!user) return;
    try {
      const docRef = doc(collection(firestore, 'inventory'), item);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const { quantity } = docSnap.data();
        if (quantity === 1) {
          await deleteDoc(docRef);
          dispatch({ type: 'REMOVE_ITEM', payload: item });
        } else {
          await setDoc(docRef, { quantity: quantity - 1, userId: user.uid });
        }
      }
      setSnackbar({ open: true, message: 'Item removed successfully!', severity: 'success' });
      updateInventory();
    } catch (error) {
      setSnackbar({ open: true, message: 'Error removing item!', severity: 'error' });
      console.error(error);
    }
  };

  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const onDragEnd = (result) => {
    if (!result.destination) {
      return;
    }

    const items = reorder(
      state.inventory,
      result.source.index,
      result.destination.index
    );

    dispatch({ type: 'REORDER_ITEMS', payload: items });
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      updateInventory();
    }
  }, [user]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleCloseSnackbar = () => {
    setSnackbar({ open: false, message: '', severity: '' });
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAuth = async () => {
    try {
      if (loginMode) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        setUser(userCredential.user);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        setUser(userCredential.user);
      }
      setSnackbar({ open: true, message: 'Authentication successful!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
      console.error(error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setSnackbar({ open: true, message: 'Logged out successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Error logging out!', severity: 'error' });
      console.error(error);
    }
  };

  const darkTheme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: darkMode ? '#1DB954' : '#1DB954', // Spotify Green
      },
      secondary: {
        main: darkMode ? '#1DB954' : '#f50057',
      },
      background: {
        default: darkMode ? '#121212' : '#f5f5f5',
        paper: darkMode ? '#282828' : '#fff', // Spotify Dark Background
      },
      text: {
        primary: darkMode ? '#ffffff' : '#000000',
        secondary: darkMode ? '#b3b3b3' : '#666666', // Spotify Text Color
      }
    },
    typography: {
      fontFamily: 'Roboto, Arial',
      h2: {
        fontWeight: 700,
        fontSize: '2rem',
        lineHeight: 1.2,
      },
      h5: {
        fontWeight: 500,
        fontSize: '1.25rem',
      },
      h6: {
        fontWeight: 400,
        fontSize: '1rem',
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: darkMode ? '#1DB954' : '#1DB954', // Spotify Button Color
            color: '#fff',
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: darkMode ? '#1ED760' : '#1ED760', // Slightly lighter green on hover
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: darkMode ? '#333' : '#fff',
            color: darkMode ? '#fff' : '#000',
          },
        },
      },
      MuiBox: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: '0 3px 6px rgba(0,0,0,0.1)',
            backgroundColor: darkMode ? '#282828' : '#fff', // Spotify Dark Background
            color: darkMode ? '#fff' : '#000',
          },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box
        position="relative"
        width="100vw"
        height="100vh"
        display="flex"
        justifyContent="center"
        flexDirection="column"
        alignItems="center"
        gap={2}
        sx={{ p: 3, bgcolor: darkTheme.palette.background.default }}
      >
        <Canvas style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Stars />
          <SpinningCube />
          <OrbitControls />
        </Canvas>
        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
        <Box display="flex" justifyContent="flex-end" width="100%">
          <Tooltip title="Toggle light/dark theme">
            <IconButton onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
        </Box>
        {!user ? (
          <Box sx={{ ...style, bgcolor: darkTheme.palette.background.paper, color: darkTheme.palette.text.primary }}>
            <Typography id="modal-modal-title" variant="h6" component="h2">
              {loginMode ? 'Login' : 'Sign Up'}
            </Typography>
            <Stack width="100%" spacing={2}>
              <TextField
                id="email"
                label="Email"
                variant="outlined"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ bgcolor: darkTheme.palette.background.default, color: darkTheme.palette.text.primary }}
              />
              <TextField
                id="password"
                label="Password"
                variant="outlined"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ bgcolor: darkTheme.palette.background.default, color: darkTheme.palette.text.primary }}
              />
              <Button
                variant="outlined"
                onClick={handleAuth}
                sx={{ bgcolor: darkTheme.palette.primary.main, color: '#fff' }}
              >
                {loginMode ? 'Login' : 'Sign Up'}
              </Button>
              <Button
                variant="text"
                onClick={() => setLoginMode(!loginMode)}
                sx={{ color: '#fff' }}
              >
                {loginMode ? 'Create an account' : 'Already have an account?'}
              </Button>
            </Stack>
          </Box>
        ) : (
          <>
            <Modal
              open={open}
              onClose={handleClose}
              aria-labelledby="modal-modal-title"
              aria-describedby="modal-modal-description"
            >
              <Box sx={{ ...style, bgcolor: darkTheme.palette.background.paper, color: darkTheme.palette.text.primary }}>
                <Typography id="modal-modal-title" variant="h6" component="h2">
                  Add Item
                </Typography>
                <Stack width="100%" direction="row" spacing={2}>
                  <TextField
                    id="outlined-basic"
                    label="Item"
                    variant="outlined"
                    fullWidth
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    sx={{ bgcolor: darkTheme.palette.background.default, color: darkTheme.palette.text.primary }}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => {
                      addItem(itemName);
                      setItemName('');
                      handleClose();
                    }}
                    sx={{ bgcolor: darkTheme.palette.primary.main, color: '#fff' }}
                  >
                    Add
                  </Button>
                </Stack>
              </Box>
            </Modal>
            <Box display="flex" justifyContent="space-between" width="100%" px={3}>
              <Button variant="contained" onClick={handleOpen} sx={{ bgcolor: darkTheme.palette.primary.main, color: '#fff' }}>
                Add New Item
              </Button>
              <Button variant="contained" onClick={handleLogout} sx={{ bgcolor: darkTheme.palette.primary.main, color: '#fff' }}>
                Logout
              </Button>
              <TextField
                variant="outlined"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ bgcolor: darkTheme.palette.background.paper, color: darkTheme.palette.text.primary }}
              />
            </Box>
            <Box border="1px solid #333" sx={{ p: 2, borderRadius: 2, bgcolor: darkTheme.palette.background.paper, boxShadow: 3, width: '90%', mt: 2 }}>
              <Box
                width="100%"
                height="100px"
                bgcolor={darkTheme.palette.primary.main}
                display="flex"
                justifyContent="center"
                alignItems="center"
                sx={{ borderRadius: 1 }}
              >
                <Typography variant="h2" color="#fff" textAlign="center">
                  Inventory Items
                </Typography>
              </Box>
              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" height="300px">
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Typography color="error">Error: {error.message}</Typography>
              ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="inventory">
                    {(provided) => (
                      <Stack width="100%" spacing={2} sx={{ overflow: 'auto', maxHeight: '300px', mt: 2 }} {...provided.droppableProps} ref={provided.innerRef}>
                        <AnimatePresence>
                          {filteredInventory.map(({ name, quantity }, index) => (
                            <Draggable key={name} draggableId={name} index={index}>
                              {(provided) => (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.5 }}
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <Box
                                    width="100%"
                                    minHeight="100px"
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    bgcolor={darkTheme.palette.background.paper}
                                    padding={2}
                                    sx={{ borderRadius: 1, boxShadow: 1 }}
                                  >
                                    <motion.div
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                    >
                                      <Typography variant="h5" color={darkTheme.palette.text.primary}>
                                        {name.charAt(0).toUpperCase() + name.slice(1)}
                                      </Typography>
                                      <Typography variant="h6" color={darkTheme.palette.text.primary}>
                                        Quantity: {quantity}
                                      </Typography>
                                    </motion.div>
                                    <Stack direction="row" spacing={2}>
                                      <Tooltip title="Add">
                                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                          <IconButton color="primary" onClick={() => addItem(name)}>
                                            <AddIcon />
                                          </IconButton>
                                        </motion.div>
                                      </Tooltip>
                                      <Tooltip title="Remove">
                                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                          <IconButton color="secondary" onClick={() => removeItem(name)}>
                                            <RemoveIcon />
                                          </IconButton>
                                        </motion.div>
                                      </Tooltip>
                                    </Stack>
                                  </Box>
                                </motion.div>
                              )}
                            </Draggable>
                          ))}
                        </AnimatePresence>
                        {provided.placeholder}
                      </Stack>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </Box>
          </>
        )}
      </Box>
    </ThemeProvider>
  );
}
