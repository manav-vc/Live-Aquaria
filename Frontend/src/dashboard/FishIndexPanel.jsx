import React, { useState, useContext, useEffect } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Fish, Weight, Ruler, Search } from 'lucide-react';
import { UserContext } from '../UserContext';
import styles from './FishIndexPanel.module.css';


export default function FishIndexPanel ({ onCatchSelect = () => {}, refreshSignal = 0 })  {
  const { user } = useContext(UserContext);
  const [catches, setCatches] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchAllCatches(searchQuery);
    }
  }, [user, refreshSignal]);


  //This is trying to fatch the fish from the mongooDb caught by that specific user  
  const fetchAllCatches = async (query = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_REACT_APP_API_URL}/get-all-fish-catches?query=${query}&username=${user.username}`);
      if (!response.ok) throw new Error('Failed to fetch fish index');
      const data = await response.json();
      setCatches(data);
      console.log("There are", data.length, "fish in the index.");
    } catch (error) {
      console.error('Error fetching fish indexes:', error);
      setError('Failed to fetch recent catches. Please try again.');
    } finally {
      setLoading(false);
    }
  };


// This sets the search asked by the user and runs the fetchAllCatches to fetch the fishes caught 
//by that specific user 

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    fetchAllCatches(e.target.value);
  };

  
  //This one is used to toggle the fishindex panel in the right hand side 
  const togglePanel = () => {
    setIsExpanded(!isExpanded);
  };


  //In the fishIndex panel for each fish record, we have a fish symbol at the start . 
  //This function sets the color of that fish based on the rarity on the color scale from blue to red 
   
  const getFishColor = (rarityScore) => {
    const hue = 200 - (rarityScore * 20); // Blue (200) to Red (0)
    return `hsl(${hue}, 100%, 50%)`;
  };

  return (
    <div className={`${styles.panel} ${isExpanded ? styles.expanded : styles.minimized}`}>
      <div className={styles.header} onClick={togglePanel}>
        <h2>Fish Index</h2>
        {isExpanded ? <ChevronUp /> : <ChevronDown />}
      </div>

      <div className={styles.searchContainer}>
        <Search className={styles.searchIcon} size={20} />
        <input
          type="text"
          placeholder="Search by fish name or rarity..."
          value={searchQuery}
          onChange={handleSearch}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loader} ></div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : catches.length === 0 ? (
          <div className={styles.noResults} >No fish catches found.</div>
        ) : (
          <ul className={styles.catchList} >
            {catches.map((fishCatch) => (
              <li key={fishCatch._id} className={styles.catchItem}  onClick={() => onCatchSelect(fishCatch)}>
                <div className={styles.catchHeader} >
                  <Fish  className={styles.fishIcon} style={{ color: getFishColor(fishCatch.rarityScore) }} />
                  <h3>{fishCatch.fishName}</h3>
                </div>
                <div className={styles.catchInfo} >
                  <p className={styles.catchDate} >{format(new Date(fishCatch.dateCaught), 'MMM dd, yyyy HH:mm')}</p>
                  <div className={styles.rarityBar} >
                    <div 
                      className={styles.rarityFill}
                      style={{ width: `${fishCatch.rarityScore * 10}%` }}
                    ></div>
                  </div>
                  <div className={styles.catchDetails} >
                    <span><Weight size={16} /> {fishCatch.weight}g</span>
                    <span><Ruler size={16} /> {fishCatch.length}cm</span>
                    <span>Rarity: {fishCatch.rarityScore}/10</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};


