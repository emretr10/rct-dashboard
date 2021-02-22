import axios from 'axios';
import { Client } from '@bandprotocol/bandchain.js';

const endpoints = {
  bakery:    'https://api.beefy.finance/bakery/price',
  bakeryLp:  'https://api.beefy.finance/bakery/lps',
  bandchain: 'https://poa-api.bandchain.org',
  bdollarLp: 'https://api.beefy.finance/bdollar/lps',
  coingecko: 'https://api.coingecko.com/api/v3/simple/price',
  jetfuelLp: 'https://api.beefy.finance/jetfuel/lps',
  kebabLp:   'https://api.beefy.finance/kebab/lps',
  monsterLP: 'https://api.beefy.finance/monster/lps',
  narwhalLp: 'https://api.beefy.finance/narwhal/lps',
  pancake:   'https://api.beefy.finance/pancake/price',
  pancakeLp: 'https://api.beefy.finance/pancake/lps',
  thugs:     'https://api.beefy.finance/thugs/tickers',
  thugsLp:   'https://api.beefy.finance/thugs/lps',
};

const CACHE_TIMEOUT = 30 * 60 * 1000;
const cache = {};

const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const BUSD = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
const WBNB_BUSD = `${WBNB}_${BUSD}`

function isCached({ oracle, id }) {
  if (`${oracle}-${id}` in cache) {
    return cache[`${oracle}-${id}`].t + CACHE_TIMEOUT > Date.now();
  }
  return false;
}

function getCachedPrice({ oracle, id }) {
  return cache[`${oracle}-${id}`].price;
}

function addToCache({ oracle, id, price }) {
  cache[`${oracle}-${id}`] = { price: price, t: Date.now() };
}

const fetchBand = async id => {
  try {
    const bandchain = new Client(endpoints.bandchain);
    const price = await bandchain.getReferenceData([id]);
    return price[0].rate;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

const fetchCoingecko = async id => {
  try {
    const response = await axios.get(endpoints.coingecko, {
      params: { ids: id, vs_currencies: 'usd' },
    });
    return response.data[id].usd;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

const fetchPancake = async id => {
  try {
    const response = await axios.get(endpoints.pancake);
    return response.data.prices[id];
  } catch (err) {
    console.error(err);
    return 0;
  }
};

const fetchThugs = async id => {
  try {
    const response = await axios.get(endpoints.thugs);
    const ticker = response.data[id];
    const bnb = response.data[WBNB_BUSD]['last_price'];

    let price = 0;

    const pair = id.split('_');
    if (pair[0] === WBNB && pair[1] === BUSD) {
      price = bnb;
    } else if (pair[0] === WBNB) {
      price = bnb / ticker['last_price'];
    } else {
      price = bnb * ticker['last_price'];
    }

    return price;
  } catch (err) {
    console.error(err);
    return 0;
  }
};

const fetchLP = async (id, endpoint) => {
  try {
    const response = await axios.get(endpoint);
    return response.data[id];
  } catch (err) {
    console.error(err);
    return 0;
  }
};

export const fetchPrice = async ({ oracle, id }) => {
  if (oracle === undefined) {
    console.error('Undefined oracle');
    return 0;
  }
  if (id === undefined) {
    console.error('Undefined pair');
    return 0;
  }

  if (isCached({ oracle, id })) {
    return getCachedPrice({ oracle, id });
  }

  let price = 0;
  switch (oracle) {
    case 'band':
      price = await fetchBand(id);
      break;
    
    case 'bakery':
      price = await fetchLP(id, endpoints.bakery);
      break;

    case 'bakery-lp':
      price = await fetchLP(id, endpoints.bakeryLp);
      break;
    
    case 'bdollar-lp':
      price = await fetchLP(id, endpoints.bdollarLp);
      break;  
    
    case 'coingecko':
      price = await fetchCoingecko(id);
      break;
    
    case 'jetfuel-lp':
      price = await fetchLP(id, endpoints.jetfuelLp);
      break;
    
    case 'kebab-lp':
      price = await fetchLP(id, endpoints.kebabLp);
      break;
    
    case 'monster-lp':
      price = await fetchLP(id, endpoints.monsterLP);
      break;
    
    case 'narwhal-lp':
      price = await fetchLP(id, endpoints.narwhalLp);
      break;
    
    case 'pancake':
      price = await fetchPancake(id);
      break;

    case 'pancake-lp':
      price = await fetchLP(id, endpoints.pancakeLp);
      break;

    case 'thugs':
      price = await fetchThugs(id);
      break;

    case 'thugs-lp':
      price = await fetchLP(id, endpoints.thugsLp);
      break;

    default: price = 0;
  }

  addToCache({ oracle, id, price });
  return price;
};
