import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { initSettings } from './lib/db.js';

initSettings().then(() => {
  mount(App, {
    target: document.getElementById('app')
  });
});