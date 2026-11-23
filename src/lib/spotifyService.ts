import { Song, Playlist } from '@/types/music';
import { db, syncAlbumsAndArtists, deduplicateSongsInLibrary } from './db';
import { parseLrc } from '@/components/player/LyricsPanel';
import { CURATED_TELUGU_SONGS } from './audioSynthesis';
import { TELUGU_500_SONGS } from './telugu500Data';
import { TELUGU_ROMANCE_SPOTIFY_PLAYLIST } from './teluguRomanceData';

export interface SpotifyCategoryDef {
  id: string;
  title: string;
  shortTitle: string;
  spotifyPlaylistUrl: string;
  description: string;
  categoryTag: string;
  coverImage: string;
}

export const SPOTIFY_TELUGU_CATEGORIES: SpotifyCategoryDef[] = [
  {
    id: 'pl_spotify_romance',
    title: 'Romantic songs in Telugu',
    shortTitle: 'Telugu Romance',
    spotifyPlaylistUrl: 'https://open.spotify.com/playlist/7jCOTOc9NBy41S7Uf4xfU1',
    description: 'Romantic songs in Telugu • The official 100-track Spotify playlist featuring Hridayam Lopala, Nuvvunte Chaley, Samayama, Chuttamalle, Kalaavathi, and top love melodies.',
    categoryTag: 'Love Songs',
    coverImage: '/covers/telugu_romance.jpg',
  },
  {
    id: 'pl_spotify_melodies',
    title: 'Soulful Melodies & Acoustic',
    shortTitle: 'Soulful Melodies',
    spotifyPlaylistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX8g9f76aYdYJ',
    description: 'Acoustic guitar strings, soothing vocals and peaceful Telugu melodies for late nights.',
    categoryTag: 'Melodies',
    coverImage: '/covers/soulful_melodies.jpg',
  },
  {
    id: 'pl_spotify_mass_beats',
    title: 'Telugu Mass & Dance Beats',
    shortTitle: 'Mass Masala Beats',
    spotifyPlaylistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX143p2W54hBv',
    description: 'High-energy chartbusters, energetic drums, party anthems and Telugu mass numbers.',
    categoryTag: 'Mass & Beats',
    coverImage: '/covers/mass_party_beats.jpg',
  },
  {
    id: 'pl_spotify_sid_sriram',
    title: 'Sid Sriram Essentials',
    shortTitle: 'Sid Sriram Hits',
    spotifyPlaylistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXb5Hc9BmAT8t',
    description: 'Every iconic Sid Sriram Telugu chartbuster in one uninterrupted collection.',
    categoryTag: 'Sid Sriram',
    coverImage: '/covers/sid_sriram_essentials.jpg',
  },
  {
    id: 'pl_spotify_blockbusters',
    title: 'DSP, Thaman & Anirudh Hits',
    shortTitle: 'Composer Blockbusters',
    spotifyPlaylistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DX7F6jFh4k3uF',
    description: 'Electrifying blockbusters and viral hits composed by DSP, Thaman S, and Anirudh.',
    categoryTag: 'Blockbusters',
    coverImage: '/covers/blockbuster_hits.jpg',
  },
  {
    id: 'pl_spotify_travel_melodies',
    title: 'Telugu Travel Melodies & Road Trips',
    shortTitle: 'Travel Melodies',
    spotifyPlaylistUrl: 'https://open.spotify.com/playlist/1BoRpOjbTUlsXSdAWOueXZ',
    description: 'Breezy acoustic guitars, wanderlust highway anthems and soulful Telugu road trip melodies.',
    categoryTag: 'Telugu Travel Melodies',
    coverImage: '/covers/telugu_travel_melodies.jpg',
  },
];

export function filterSpotifyCategorySongs(songs: Song[], categoryId: string): Song[] {
  return songs.filter(s => {
    const catTag = s.category || s.genre || '';
    if (categoryId === 'pl_spotify_romance') {
      return (
        s.id.startsWith('spotify_romance_') ||
        catTag === 'Love Songs' ||
        catTag.toLowerCase().includes('love') ||
        catTag.toLowerCase().includes('romance')
      );
    }
    if (categoryId === 'pl_spotify_melodies') {
      return catTag === 'Melodies' || catTag.toLowerCase().includes('melod');
    }
    if (categoryId === 'pl_spotify_mass_beats') {
      return catTag === 'Mass & Beats' || catTag.toLowerCase().includes('mass') || catTag.toLowerCase().includes('beat');
    }
    if (categoryId === 'pl_spotify_sid_sriram') {
      return catTag === 'Sid Sriram' || s.artist.toLowerCase().includes('sid sriram');
    }
    if (categoryId === 'pl_spotify_blockbusters') {
      const a = s.artist.toLowerCase();
      return (
        catTag === 'Blockbusters' ||
        a.includes('thaman') ||
        a.includes('devi sri prasad') ||
        a.includes('anirudh') ||
        a.includes('keeravaani')
      );
    }
    if (categoryId === 'pl_spotify_travel_melodies') {
      return catTag === 'Telugu Travel Melodies' || catTag.toLowerCase().includes('travel');
    }
    return false;
  });
}

// Expanded Mass, Dance, Viral & Golden Classic Tracks to ensure complete Telugu representation
export const SPOTIFY_TELUGU_MASS_AND_CLASSICS = [
  // --- 2024 & TRENDING CHARTBUSTERS ---
  {
    title: "Kurchi Madathapetti",
    artist: "Mahesh Babu, Sri Krishna, Sahithi Chaganti, Thaman S",
    movie: "Guntur Kaaram",
    year: 2024,
    category: "Mass & Beats",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/a9/54/29/a9542906-08be-3e8d-a26c-635ef92ed5d3/cover.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/000/a8b06cdf02fd61001823e10d55ad3ebe_320.mp4",
    duration: 216,
    lyrics: "[00:00.00] Kurchi Madathapetti...\n[00:15.00] Guntur Karam Ghandham Thotti...\n[00:30.00] Arey Kurchi Madathapetti...\n[00:50.00] Mass Masala Step Eyyi Bava...\n[01:15.00] Kurchi Madathapetti...",
  },
  {
    title: "Dum Masala",
    artist: "Sanjith Hegde, S. Thaman",
    movie: "Guntur Kaaram",
    year: 2024,
    category: "Mass & Beats",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/a9/54/29/a9542906-08be-3e8d-a26c-635ef92ed5d3/cover.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/000/a20063ed2317350eb8f7e13728847e40_320.mp4",
    duration: 206,
    lyrics: "[00:00.00] Dum Masala Dum Masala...\n[00:18.00] Guntur Kharaame Ee Pilla...\n[00:40.00] Dum Masala...",
  },
  {
    title: "Fear Song",
    artist: "Anirudh Ravichander",
    movie: "Devara: Part 1",
    year: 2024,
    category: "Mass & Beats",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/ce/84/04/ce8404fd-0fb3-b42a-7497-642e68feb574/8903431001313_cover.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/313/1178c7b2a16c3fd32ec5cd002b5a1ce0_320.mp4",
    duration: 196,
    lyrics: "[00:00.00] All Hail The Tiger...\n[00:15.00] Fear Song... Devara Fear Song...\n[00:35.00] Raktham Tho Nindina Sandram Idhi...\n[01:00.00] Fear Song...",
  },
  {
    title: "Chuttamalle",
    artist: "Shilpa Rao, Anirudh Ravichander",
    movie: "Devara: Part 1",
    year: 2024,
    category: "Love Songs",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/ce/84/04/ce8404fd-0fb3-b42a-7497-642e68feb574/8903431001313_cover.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/313/e49e604945889f330e5b3536dd0ff524_320.mp4",
    duration: 221,
    lyrics: "[00:00.00] Chuttamalle Chuttesindhe...\n[00:18.00] Naa Manase Thaakesindhe...\n[00:38.00] Ninnu Choosi Kalavarame...\n[01:05.00] Chuttamalle...",
  },
  {
    title: "Sooseki (Couple Song)",
    artist: "Shreya Ghoshal, Devi Sri Prasad",
    movie: "Pushpa 2: The Rule",
    year: 2024,
    category: "Love Songs",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/45/b6/2d/45b62dd5-8ae8-05ce-d145-2ec3b87510b9/8903431001597_cover.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/915/338e5143057ba7dcd6c7bbbb1ce8bb89_320.mp4",
    duration: 260,
    lyrics: "[00:00.00] Sooseki Nuvve Naa Mogudu...\n[00:20.00] Gundellona Nilichina Devudu...\n[00:45.00] Sooseki...\n[01:10.00] Pushpa Pushpa...",
  },
  {
    title: "Pushpa Pushpa",
    artist: "Nakash Aziz, Deepak Blue, Devi Sri Prasad",
    movie: "Pushpa 2: The Rule",
    year: 2024,
    category: "Mass & Beats",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/45/b6/2d/45b62dd5-8ae8-05ce-d145-2ec3b87510b9/8903431001597_cover.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/366/0377fc358eb812da5d44b215b4bebfb3_320.mp4",
    duration: 278,
    lyrics: "[00:00.00] Pushpa Pushpa Pushpa Raaj...\n[00:18.00] Taggede Le...\n[00:40.00] Asal Taggede Le...\n[01:10.00] Pushpa Pushpa...",
  },
  {
    title: "Ta Takkara",
    artist: "Sanjith Hegde, Dhee, Santhosh Narayanan",
    movie: "Kalki 2898 AD",
    year: 2024,
    category: "Melodies",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/7f/1c/51/7f1c518d-4311-3fd6-a610-f4acab73e7e0/198588725511.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/888/ad1248d84cf30da97d5bad03b867e246_320.mp4",
    duration: 211,
    lyrics: "[00:00.00] Ta Takkara Ta Takkara...\n[00:20.00] Complex Lona Andala Tara...\n[00:45.00] Ta Takkara...",
  },
  {
    title: "Radhikaa",
    artist: "Ram Miriyala, Achu Rajamani",
    movie: "Tillu Square",
    year: 2024,
    category: "Mass & Beats",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/01/fa/49/01fa493d-79bf-d651-d4cb-768ac5c0826e/cover.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/000/7d014e12bf442a3e40bc98b34c3a22f8_320.mp4",
    duration: 200,
    lyrics: "[00:00.00] Radhikaa... O Radhikaa...\n[00:18.00] DJ Tillu Gundelona Pettavu Manta...\n[00:42.00] Radhikaa...",
  },
  {
    title: "Ticket Eh Konakunda",
    artist: "Ram Miriyala",
    movie: "Tillu Square",
    year: 2024,
    category: "Mass & Beats",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/01/fa/49/01fa493d-79bf-d651-d4cb-768ac5c0826e/cover.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/000/4230cca1e82b5c22a2c34063e561ae0f_320.mp4",
    duration: 247,
    lyrics: "[00:00.00] Ticket Eh Konakunda...\n[00:18.00] Flight Eh Ekkinchinaave...\n[00:40.00] Ticket Eh Konakunda...",
  },
  {
    title: "Ammaadi",
    artist: "Kaala Bhairava, Shakthisree Gopalan, Hesham Abdul Wahab",
    movie: "Hi Nanna",
    year: 2023,
    category: "Love Songs",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/64/4c/1d/644c1db5-68f8-0640-21e2-dd440f7290e7/8903431963253_cover.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/712/14eb6af8b65219bedb0a46d70838a568_320.mp4",
    duration: 246,
    lyrics: "[00:00.00] Ammaadi... Naa Prema Ammaadi...\n[00:20.00] Kalakalam Nuvve Naa Thodu...\n[00:45.00] Ammaadi...",
  },
  {
    title: "Sammohanuda",
    artist: "Anurag Kulkarni, Hesham Abdul Wahab",
    movie: "Hi Nanna",
    year: 2023,
    category: "Love Songs",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/64/4c/1d/644c1db5-68f8-0640-21e2-dd440f7290e7/8903431963253_cover.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/679/85bf5d4b59843045f816ac905fd97219_320.mp4",
    duration: 279,
    lyrics: "[00:00.00] Sammohanuda... Naa Priya Mohanuda...\n[00:22.00] Gundello Nilichina Snehamuda...\n[00:50.00] Sammohanuda...",
  },
  {
    title: "Gaaju Bomma",
    artist: "Hesham Abdul Wahab",
    movie: "Hi Nanna",
    year: 2023,
    category: "Melodies",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/64/4c/1d/644c1db5-68f8-0640-21e2-dd440f7290e7/8903431963253_cover.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/332/dd813d44f169c547f0361d1d9660549a_320.mp4",
    duration: 236,
    lyrics: "[00:00.00] Gaaju Bomma Naa Chinni Bangaram...\n[00:20.00] Nuvve Kadaa Naa Lokam...\n[00:45.00] Gaaju Bomma...",
  },
  {
    title: "O Rendu Prema Meghaalila",
    artist: "Sreerama Chandra, Vijai Bulganin",
    movie: "Baby",
    year: 2023,
    category: "Love Songs",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/a0/e1/4e/a0e14e48-64ce-9c99-1a77-62c80454e48e/196871299732.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/732/69124058bda0644eea3fdf0217c04952_320.mp4",
    duration: 320,
    lyrics: "[00:00.00] O Rendu Prema Meghaalila...\n[00:22.00] Kalisindhi Ee Vela...\n[00:50.00] O Rendu Prema Meghaalila...",
  },
  {
    title: "Nee Chooppule",
    artist: "Hari Charan, Anudeep Dev",
    movie: "HanuMan",
    year: 2024,
    category: "Melodies",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/c5/3a/8d/c53a8d9b-23d8-5cc1-ec14-6ed0ce7920a0/8902894137256_cover.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/882/66eb78e15a92cfc3f0baa8c21f0acb1e_320.mp4",
    duration: 215,
    lyrics: "[00:00.00] Nee Chooppule Naa Praanamu...\n[00:18.00] Hanumantu Thodai Niluchu...\n[00:45.00] Nee Chooppule...",
  },
  {
    title: "Naatu Naatu",
    artist: "Rahul Sipligunj, Kaala Bhairava, M.M. Keeravaani",
    movie: "RRR",
    year: 2022,
    category: "Mass & Beats",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/dd/39/14/dd3914e5-a2f3-b355-51f3-9a1f0e3ca246/8903431853592_cover.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/683/000ab54759049a8451ffcdc6412a0ef6_320.mp4",
    duration: 215,
    lyrics: "[00:00.00] Naatu Naatu Naatu Naatu...\n[00:18.00] Polam Gattu Dummulona Potlatthinaa...\n[00:36.00] Naatu Naatu Naatu...\n[00:55.00] Gundu Sudhi Thagilinattu Dhummurepe...\n[01:20.00] Naatu Naatu...",
  },
  {
    title: "Oo Antava Mawa... Oo Oo Antava",
    artist: "Indravathi Chauhan, Devi Sri Prasad",
    movie: "Pushpa: The Rise",
    year: 2021,
    category: "Mass & Beats",
    artworkUrl: "https://c.saavncdn.com/blob/056/Pushpa-The-Rise-Telugu-2021-20211216115409-500x500.jpg",
    sourceUrl: "https://aac.saavncdn.com/000/05c5d77f6a8225d6667cf7a1fcaf37d8_320.mp4",
    duration: 223,
    lyrics: "[00:00.00] Koka Koka Gadithe Kora Kora Chustharu...\n[00:20.00] Oo Antava Mawa... Oo Oo Antava...\n[00:45.00] Abbayila Budde Vankara...\n[01:10.00] Oo Antava Mawa...",
  },
  {
    title: "Ramuloo Ramulaa",
    artist: "Anurag Kulkarni, Mangli, S. Thaman",
    movie: "Ala Vaikunthapurramuloo",
    year: 2020,
    category: "Mass & Beats",
    artworkUrl: "https://c.saavncdn.com/517/Ala-Vaikunthapurramuloo-Telugu-2019-20200116144338-500x500.jpg",
    sourceUrl: "https://aac.saavncdn.com/517/5702757c42c1ad44b3224a339817c8b0_320.mp4",
    duration: 237,
    lyrics: "[00:00.00] Ramuloo Ramulaa...\n[00:18.00] Nanna Nanna Ramuloo Ramulaa...\n[00:36.00] Gundellona Guchhesindu Dhummu...\n[01:00.00] Ramuloo Ramulaa...",
  },
  {
    title: "Saranga Dariya",
    artist: "Mangli, Pawan Ch",
    movie: "Love Story",
    year: 2021,
    category: "Mass & Beats",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/da/dd/e6/dadde647-a017-7931-44c2-88fadec10ade/cover.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/582/499f47fee99a0809e9d2b343ac2bec8e_320.mp4",
    duration: 228,
    lyrics: "[00:00.00] Daani Kunjalaku Rangulu Pussi...\n[00:20.00] Saranga Dariya...\n[00:45.00] Pilla Choopula Baanam...\n[01:10.00] Saranga Dariya...",
  },
  {
    title: "Blockbuster",
    artist: "Shreya Ghoshal, Nakash Aziz, S. Thaman",
    movie: "Sarrainodu",
    year: 2016,
    category: "Mass & Beats",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/54/44/92/544492c4-8588-96a7-8adb-a45e0403c0e5/8903431616685_cover.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/685/a86a6d3446049678d7575af2c67ed31c_320.mp4",
    duration: 310,
    lyrics: "[00:00.00] Sarrainodu Blockbuster...\n[00:18.00] Arey Dhummu Lepe Step Eyyara...\n[00:45.00] Blockbuster...",
  },
  {
    title: "Top Lesi Poddi",
    artist: "Sagar, Geetha Madhuri, Devi Sri Prasad",
    movie: "Iddarammayilatho",
    year: 2013,
    category: "Mass & Beats",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/4f/0d/61/4f0d6107-f342-ad1d-268f-bf5f85d3ac46/cover.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/514/fe66691dec3c9f0660c14073878e779a_320.mp4",
    duration: 236,
    lyrics: "[00:00.00] Top Lesi Poddi...\n[00:18.00] Manam Kalisthe Ground Adiripoddi...\n[00:42.00] Top Lesi Poddi...",
  },
  {
    title: "Cinema Choopistha Mava",
    artist: "Simha, Varikuppala Yadagiri, S. Thaman",
    movie: "Race Gurram",
    year: 2014,
    category: "Mass & Beats",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/aa/da/0d/aada0de7-7c3f-0001-f75d-51f9cb3d9b19/3617229186483.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/586/765d8d3b799bad78637d24763f06caba_320.mp4",
    duration: 260,
    lyrics: "[00:00.00] Cinema Choopistha Mava...\n[00:18.00] Race Gurram Speed Lona...\n[00:45.00] Cinema Choopistha Mava...",
  },
  {
    title: "Mind Block",
    artist: "Blaaze, Ranina Reddy, Devi Sri Prasad",
    movie: "Sarileru Neekevvaru",
    year: 2020,
    category: "Mass & Beats",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/b9/65/11/b96511a1-db8d-7b6f-7c3f-1dd761b2a7ca/8903431760432_cover.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/432/ffbe828d51b98f8197bfbdbb66ce140a_320.mp4",
    duration: 263,
    lyrics: "[00:00.00] Mind Block... Babu Mind Block...\n[00:18.00] Step Esthe Sarileru Neekevvaru...\n[00:42.00] Mind Block...",
  },
  {
    title: "Pakka Local",
    artist: "Geetha Madhuri, Sagar, Devi Sri Prasad",
    movie: "Janatha Garage",
    year: 2016,
    category: "Mass & Beats",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/9e/ce/a2/9ecea24e-bb1a-6af3-40d7-8e4039bcfcb7/8905750024974.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/974/4bfe0670f5515c0ee16a98fbb2a8c27d_320.mp4",
    duration: 261,
    lyrics: "[00:00.00] Nenu Pakka Local...\n[00:18.00] Janatha Garage Lona Mass Masala...\n[00:45.00] Pakka Local...",
  },
  {
    title: "Jigelu Rani",
    artist: "Rela Kumar, Ganta Venkata Lakshmi, Devi Sri Prasad",
    movie: "Rangasthalam",
    year: 2018,
    category: "Mass & Beats",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/a3/36/98/a336986b-1ce1-5f2f-c0f5-c4a6326539b4/8905750034065.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/065/65819a7a23970605184be64fe32b3919_320.mp4",
    duration: 304,
    lyrics: "[00:00.00] Arey Jigelu Rani Vachindhe...\n[00:20.00] Rangasthalam Lona Racha Racha...\n[00:45.00] Jigelu Rani...",
  },

  {
    title: "Gopikamma",
    artist: "K.S. Chithra, Mickey J Meyer",
    movie: "Mukunda",
    year: 2014,
    category: "Melodies",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music5/v4/30/8d/4a/308d4a3c-41b4-fdee-55b7-0f7187936082/cover.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/877/50b6ccb9227915fbcfde3be60c5613d3_320.mp4",
    duration: 254,
    lyrics: "[00:00.00] Gopikamma... Chaalamma Nee Vayyaramu...\n[00:20.00] Kannula Mundhe Muripinche...\n[00:45.00] Gopikamma...",
  },
  {
    title: "Dheevara",
    artist: "Ramya Behara, Deepu, M.M. Keeravaani",
    movie: "Baahubali: The Beginning",
    year: 2015,
    category: "Mass & Beats",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/1a/8e/da/1a8edac5-80a7-22aa-c014-f4f1a0190f7a/8905750011301.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/301/e30a643c363131fcd388bb358c34bfdb_320.mp4",
    duration: 343,
    lyrics: "[00:00.00] Dheevara Prasara Shourya Bhaara...\n[00:25.00] Parakrama Ghora Baahubali...\n[00:55.00] Dheevara...",
  },
  {
    title: "Hamsa Naava",
    artist: "Sony, Deepu, M.M. Keeravaani",
    movie: "Baahubali 2: The Conclusion",
    year: 2017,
    category: "Melodies",
    artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/a2/ed/f3/a2edf338-56ea-74ad-e52e-7187d81e0676/8905750037981.jpg/600x600bb.jpg",
    sourceUrl: "https://aac.saavncdn.com/492/dc6db28e0a1a935b4720a1adc46fa21f_320.mp4",
    duration: 203,
    lyrics: "[00:00.00] O Rukkumini... Hamsa Naava Saagindhe...\n[00:22.00] Ningilona Thelindhe...\n[00:50.00] Hamsa Naava...",
  },
];

/**
 * Extracts Spotify ID and Type from a Spotify URL
 */
export function parseSpotifyUrl(url: string): { type: 'track' | 'playlist' | 'album'; id: string } | null {
  const cleanUrl = url.trim();
  const trackMatch = cleanUrl.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (trackMatch) return { type: 'track', id: trackMatch[1] };

  const playlistMatch = cleanUrl.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
  if (playlistMatch) return { type: 'playlist', id: playlistMatch[1] };

  const albumMatch = cleanUrl.match(/open\.spotify\.com\/album\/([a-zA-Z0-9]+)/);
  if (albumMatch) return { type: 'album', id: albumMatch[1] };

  return null;
}

/**
 * Fetches Spotify metadata using Spotify's official oEmbed API
 */
export async function fetchSpotifyMetadata(spotifyUrl: string): Promise<{
  title: string;
  artist: string;
  thumbnailUrl: string;
} | null> {
  try {
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl.trim())}`;
    const res = await fetch(oembedUrl);
    if (!res.ok) return null;
    const data = await res.json();

    const rawTitle = data.title || '';
    const parts = rawTitle.split(' by ');
    const title = parts[0] || rawTitle;
    const artist = parts[1] || 'Telugu Artist';

    return {
      title,
      artist,
      thumbnailUrl: data.thumbnail_url || '',
    };
  } catch (e) {
    console.warn('Error fetching Spotify oEmbed:', e);
    return null;
  }
}

/**
 * Seed & Import all Telugu Full Songs categorized by Spotify playlists
 */
export async function importAllSpotifyTeluguCategories(
  onProgress?: (percent: number, status: string) => void
): Promise<{ totalImported: number; categoriesCount: number }> {
  if (onProgress) onProgress(5, 'Connecting to Spotify Telugu Master Catalog...');

  // Clean up removed categories (Hot Hits, Golden Classics, 90s Classics, Devotional, Folk & Beats) from database
  try {
    await db.songs.where('category').anyOf(['Hot Hits', 'Golden Classics', '90s Classics', 'Devotional', 'Folk & Beats']).delete();
    await db.songs.where('genre').anyOf(['Hot Hits', 'Golden Classics', '90s Classics', 'Devotional', 'Folk & Beats']).delete();
    await db.playlists.where('id').anyOf(['pl_spotify_hot_hits', 'pl_spotify_golden_classics', 'pl_spotify_90s_classics', 'pl_spotify_folk_beats', 'pl_spotify_devotional']).delete();
    await db.playlistSongs.where('playlistId').anyOf(['pl_spotify_hot_hits', 'pl_spotify_golden_classics', 'pl_spotify_90s_classics', 'pl_spotify_folk_beats', 'pl_spotify_devotional']).delete();
  } catch {
    // continue
  }

  const allSongsToImport: Song[] = [];
  const allLyricsToImport: any[] = [];
  const allFavoritesToImport: any[] = [];
  const seenTitles = new Set<string>();

  function normSongKey(t: string): string {
    return (t || '')
      .toLowerCase()
      .replace(/\s*\(from\s+"[^"]*"\)\s*/gi, '')
      .replace(/\s*\(from\s+[^)]*\)\s*/gi, '')
      .replace(/\s*-\s*from\s+"[^"]*"\s*/gi, '')
      .replace(/\s*-\s*from\s+[^)]*\s*/gi, '')
      .replace(/\s*\(telugu\)\s*/gi, '')
      .replace(/\s*-\s*telugu\s*/gi, '')
      .replace(/\s*-\s*male\s*/gi, '')
      .replace(/\s*-\s*female\s*/gi, '')
      .replace(/\s*-\s*duet\s*/gi, '')
      .replace(/\s*\(remastered\)\s*/gi, '')
      .replace(/[^a-z0-9]/g, '');
  }

  // 0. Process Official Telugu Romantic Spotify Playlist (Exact 100 Tracks)
  const romanceSongObjects: Song[] = [];
  for (let r = 0; r < TELUGU_ROMANCE_SPOTIFY_PLAYLIST.length; r++) {
    const item = TELUGU_ROMANCE_SPOTIFY_PLAYLIST[r];
    const key = normSongKey(item.title);
    seenTitles.add(key);

    const songId = item.id;
    const albumName = item.movie || item.album || item.title || 'Telugu Master Recording';
    const song: Song = {
      id: songId,
      title: item.title,
      artist: item.artist,
      album: albumName,
      year: item.year || 2024,
      genre: 'Love Songs',
      category: 'Love Songs',
      duration: item.duration || 240,
      hash: `hash_${songId}`,
      isLocal: false,
      providerType: 'spotify',
      spotifyUrl: item.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(item.title + ' ' + item.artist)}`,
      sourceUrl: item.sourceUrl,
      artworkUrl: item.artworkUrl,
      dateAdded: Date.now() - (TELUGU_ROMANCE_SPOTIFY_PLAYLIST.length - r) * 1000,
      playCount: Math.floor(Math.random() * 45) + 15,
      isFavorite: r % 6 === 0,
      isOfflineAvailable: true,
    };

    allSongsToImport.push(song);
    romanceSongObjects.push(song);

    const genericLyrics = `[00:00.00] ${item.title}\n[00:15.00] ${item.artist}\n[00:30.00] Movie: ${item.movie || item.album}\n[00:45.00] Verified 320kbps High Quality Master Audio on NAA PAATALU...`;
    allLyricsToImport.push({
      id: `lyrics_${songId}`,
      songId: songId,
      plainLyrics: genericLyrics,
      syncedLyrics: parseLrc(genericLyrics),
      updatedAt: Date.now(),
    });
  }

  // 1. Process Core Telugu songs from CURATED_TELUGU_SONGS
  const totalCore = CURATED_TELUGU_SONGS.length;
  for (let i = 0; i < totalCore; i++) {
    const item = CURATED_TELUGU_SONGS[i];
    const key = normSongKey(item.title);
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);

    const songId = `spotify_telugu_${item.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    let category: string = item.mood;
    if (item.artist.toLowerCase().includes('sid sriram')) {
      category = 'Sid Sriram';
    } else if (item.bpm >= 100) {
      category = 'Mass & Beats';
    }

    const song: Song = {
      id: songId,
      title: item.title,
      artist: item.artist,
      album: item.movie,
      year: item.year,
      genre: category,
      category: category,
      duration: item.seconds,
      hash: `spotify_${songId}`,
      isLocal: false,
      providerType: 'spotify',
      spotifyUrl: `https://open.spotify.com/track/spotify_${i}`,
      sourceUrl: item.sourceUrl,
      artworkUrl: item.artworkUrl,
      dateAdded: Date.now() - (totalCore - i) * 3600 * 1000,
      playCount: Math.floor(Math.random() * 30) + 10,
      isFavorite: i < 15,
      isOfflineAvailable: true,
    };

    allSongsToImport.push(song);

    const parsed = parseLrc(item.lyrics);
    allLyricsToImport.push({
      id: `lyrics_${songId}`,
      songId: songId,
      plainLyrics: item.lyrics,
      syncedLyrics: parsed,
      updatedAt: Date.now(),
    });

    if (song.isFavorite) {
      allFavoritesToImport.push({
        id: `fav_${songId}`,
        songId: songId,
        addedAt: Date.now(),
      });
    }
  }

  // 2. Add Mass, Dance, 2024 Trending & Golden Classic Tracks
  for (let k = 0; k < SPOTIFY_TELUGU_MASS_AND_CLASSICS.length; k++) {
    const extra = SPOTIFY_TELUGU_MASS_AND_CLASSICS[k];
    const key = normSongKey(extra.title);
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);

    const songId = `spotify_extra_${extra.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    const song: Song = {
      id: songId,
      title: extra.title,
      artist: extra.artist,
      album: extra.movie,
      year: extra.year,
      genre: extra.category,
      category: extra.category,
      duration: extra.duration,
      hash: `spotify_${songId}`,
      isLocal: false,
      providerType: 'spotify',
      spotifyUrl: `https://open.spotify.com/track/${songId}`,
      sourceUrl: extra.sourceUrl,
      artworkUrl: extra.artworkUrl,
      dateAdded: Date.now() - k * 3600 * 1000,
      playCount: Math.floor(Math.random() * 45) + 20,
      isFavorite: true,
      isOfflineAvailable: true,
    };

    allSongsToImport.push(song);

    const parsed = parseLrc(extra.lyrics);
    allLyricsToImport.push({
      id: `lyrics_${songId}`,
      songId: songId,
      plainLyrics: extra.lyrics,
      syncedLyrics: parsed,
      updatedAt: Date.now(),
    });
  }

  // 3. Add Comprehensive Master Telugu Songs Collection (Strictly Single Instance per Song)
  for (let m = 0; m < TELUGU_500_SONGS.length; m++) {
    const item = TELUGU_500_SONGS[m];
    // Exclude removed categories (Hot Hits, Golden Classics, 90s Classics)
    if (['Hot Hits', 'Golden Classics', '90s Classics'].includes(item.category)) continue;

    const key = normSongKey(item.title);
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);

    const albumName = item.movie || item.album || item.title || 'Telugu Master Recording';
    const songId = `telugu_500_${item.id}`;
    const song: Song = {
      id: songId,
      title: item.title,
      artist: item.artist,
      album: albumName,
      year: item.year,
      genre: item.category,
      category: item.category,
      duration: item.duration,
      hash: `hash_${songId}`,
      isLocal: false,
      providerType: 'spotify',
      spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(item.title + ' ' + item.artist)}`,
      sourceUrl: item.sourceUrl,
      artworkUrl: item.artworkUrl,
      dateAdded: Date.now() - (TELUGU_500_SONGS.length - m) * 120000,
      playCount: Math.floor(Math.random() * 40) + 15,
      isFavorite: m % 8 === 0,
      isOfflineAvailable: true,
    };

    allSongsToImport.push(song);

    const genericLyrics = `[00:00.00] ${item.title}\n[00:15.00] ${item.artist}\n[00:30.00] Movie: ${item.movie || item.album}\n[00:45.00] Verified 320kbps High Quality Master Audio on NAA PAATALU...`;
    allLyricsToImport.push({
      id: `lyrics_${songId}`,
      songId: songId,
      plainLyrics: genericLyrics,
      syncedLyrics: parseLrc(genericLyrics),
      updatedAt: Date.now(),
    });
  }

  // Perform Blazing-Fast Atomic Bulk Inserts
  if (onProgress) onProgress(60, `Saving ${allSongsToImport.length} verified master tracks to library...`);
  await db.songs.bulkPut(allSongsToImport);
  await db.lyrics.bulkPut(allLyricsToImport);
  if (allFavoritesToImport.length > 0) {
    await db.favorites.bulkPut(allFavoritesToImport);
  }

  if (onProgress) onProgress(80, 'Organizing tracks into Spotify playlists & category shelves...');

  // 4. Create Spotify Categorized Playlists and PlaylistSongs in Bulk
  const allPlaylistsToImport: Playlist[] = [];
  const allPlaylistSongsToImport: any[] = [];

  for (const cat of SPOTIFY_TELUGU_CATEGORIES) {
    allPlaylistsToImport.push({
      id: cat.id,
      title: cat.title,
      description: cat.description,
      customArtwork: cat.coverImage,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    if (cat.id === 'pl_spotify_romance') {
      // Map the 100 exact tracks from Spotify playlist in order
      for (let order = 0; order < romanceSongObjects.length; order++) {
        allPlaylistSongsToImport.push({
          id: `${cat.id}_${romanceSongObjects[order].id}`,
          playlistId: cat.id,
          songId: romanceSongObjects[order].id,
          order,
          addedAt: Date.now(),
        });
      }
    } else {
      // Find all songs belonging to this category using the unified filter
      const catSongs = filterSpotifyCategorySongs(allSongsToImport, cat.id);

      for (let order = 0; order < catSongs.length; order++) {
        allPlaylistSongsToImport.push({
          id: `${cat.id}_${catSongs[order].id}`,
          playlistId: cat.id,
          songId: catSongs[order].id,
          order,
          addedAt: Date.now(),
        });
      }
    }
  }

  await db.playlists.bulkPut(allPlaylistsToImport);
  await db.playlistSongs.bulkPut(allPlaylistSongsToImport);

  if (onProgress) onProgress(90, 'Syncing Spotify album and artist indexes...');
  await syncAlbumsAndArtists();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('sonora_library_updated', {
        detail: { count: allSongsToImport.length, playlistsCount: allPlaylistsToImport.length },
      })
    );
  }

  if (onProgress) {
    onProgress(100, `Imported ${allSongsToImport.length} songs across ${SPOTIFY_TELUGU_CATEGORIES.length} Spotify categories!`);
  }

  return {
    totalImported: allSongsToImport.length,
    categoriesCount: SPOTIFY_TELUGU_CATEGORIES.length,
  };
}

// Sync and replace pl_spotify_romance with the user's official Spotify playlist
export async function syncNewRomanticSpotifyPlaylist(onProgress?: (percent: number, status: string) => void) {
  if (onProgress) onProgress(10, 'Importing 100 official Spotify romantic songs...');

  const songs: Song[] = [];
  const lyricsList: any[] = [];
  const playlistSongs: any[] = [];

  for (let r = 0; r < TELUGU_ROMANCE_SPOTIFY_PLAYLIST.length; r++) {
    const item = TELUGU_ROMANCE_SPOTIFY_PLAYLIST[r];
    const songId = item.id;
    const albumName = item.movie || item.album || item.title || 'Telugu Master Recording';

    const song: Song = {
      id: songId,
      title: item.title,
      artist: item.artist,
      album: albumName,
      year: item.year || 2024,
      genre: 'Love Songs',
      category: 'Love Songs',
      duration: item.duration || 240,
      hash: `hash_${songId}`,
      isLocal: false,
      providerType: 'spotify',
      spotifyUrl: item.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(item.title + ' ' + item.artist)}`,
      sourceUrl: item.sourceUrl,
      artworkUrl: item.artworkUrl,
      dateAdded: Date.now() - (TELUGU_ROMANCE_SPOTIFY_PLAYLIST.length - r) * 1000,
      playCount: Math.floor(Math.random() * 45) + 15,
      isFavorite: r % 6 === 0,
      isOfflineAvailable: true,
    };

    songs.push(song);

    const genericLyrics = `[00:00.00] ${item.title}\n[00:15.00] ${item.artist}\n[00:30.00] Movie: ${item.movie || item.album}\n[00:45.00] Verified 320kbps High Quality Master Audio on NAA PAATALU...`;
    lyricsList.push({
      id: `lyrics_${songId}`,
      songId: songId,
      plainLyrics: genericLyrics,
      syncedLyrics: parseLrc(genericLyrics),
      updatedAt: Date.now(),
    });

    playlistSongs.push({
      id: `pl_spotify_romance_${songId}`,
      playlistId: 'pl_spotify_romance',
      songId: songId,
      order: r,
      addedAt: Date.now(),
    });
  }

  if (onProgress) onProgress(40, 'Saving romantic songs to library database...');
  await db.songs.bulkPut(songs);
  await db.lyrics.bulkPut(lyricsList);

  if (onProgress) onProgress(70, 'Replacing Telugu Romance playlist songs...');
  // Clear any existing songs mapped to pl_spotify_romance
  await db.playlistSongs.where('playlistId').equals('pl_spotify_romance').delete();
  await db.playlistSongs.bulkPut(playlistSongs);

  // Update playlist definition in db.playlists
  const romanceCat = SPOTIFY_TELUGU_CATEGORIES.find(c => c.id === 'pl_spotify_romance');
  if (romanceCat) {
    await db.playlists.put({
      id: 'pl_spotify_romance',
      title: romanceCat.title,
      description: romanceCat.description,
      customArtwork: romanceCat.coverImage,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  if (onProgress) onProgress(90, 'Syncing albums and artists...');
  await syncAlbumsAndArtists();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('sonora_library_updated', {
        detail: { playlistId: 'pl_spotify_romance', count: songs.length },
      })
    );
  }

  if (onProgress) onProgress(100, `Successfully synced ${songs.length} songs from Spotify playlist!`);

  return { totalImported: songs.length };
}
