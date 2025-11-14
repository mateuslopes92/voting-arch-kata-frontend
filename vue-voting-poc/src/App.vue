<template>
  <div class="p-6 max-w-md mx-auto space-y-4">
    <h1 class="text-2xl font-bold mb-4">🗳️ Voting System POC</h1>

    <div class="flex gap-2 items-center">
      <button
        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-10"
        @click="castVote"
      >
        Cast Vote
      </button>
      <button
        class="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
        @click="toggleOnline"
      >
        {{ isOnline ? 'Go Offline' : 'Go Online' }}
      </button>
    </div>

    <p class="text-sm text-gray-600">
      Status: <strong>{{ isOnline ? 'Online' : 'Offline' }}</strong>
    </p>

    <div>
      <h2 class="text-lg font-semibold mt-4">Queued Votes</h2>
      <ul class="divide-y">
        <li v-for="vote in votes" :key="vote.id" class="py-2 flex justify-between items-center">
          <div>
            <p class="text-sm">🆔 {{ vote.id }}</p>
            <p class="text-xs text-gray-500">Status: {{ vote.status }}</p>
            <p class="text-xs text-gray-400">Key: {{ vote.idempotencyKey }}</p>
          </div>
          <p v-if="vote.status === 'failed'" class="text-red-600 text-xs">Retries: {{ vote.retries }}</p>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { db } from './db';

// ---- State ----
const votes = ref([]);
const isOnline = ref(true);
let syncInterval = null;

// ---- Utils ----
function generateId() {
  return 'vote-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
}

async function signVote(voteId) {
  const encoder = new TextEncoder();
  const data = encoder.encode(voteId);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---- Main Actions ----
async function castVote() {
  const id = generateId();
  const idempotencyKey = crypto.randomUUID();
  const signature = await signVote(id + idempotencyKey);

  await db.votes.add({
    id,
    idempotencyKey,
    status: 'queued',
    retries: 0,
    signature
  });

  await loadVotes();
}

async function loadVotes() {
  votes.value = await db.votes.toArray();
}

async function sendVote(vote) {
  // Simulate sending to backend
  if (!isOnline.value) return false;

  await new Promise(resolve => setTimeout(resolve, 500));

  // Random chance of failure
  const success = Math.random() > 0.1;
  if (!success) throw new Error('Network error');

  return true;
}

async function processQueue() {
  const queued = await db.votes.where('status').equals('queued').toArray();

  for (const vote of queued) {
    try {
      await db.votes.update(vote.id, { status: 'sending' });
      const success = await sendVote(vote);

      if (success) {
        await db.votes.delete(vote.id);
      }
    } catch {
      await db.votes.update(vote.id, {
        status: 'failed',
        retries: vote.retries + 1
      });
    }
  }

  await loadVotes();
}

function toggleOnline() {
  isOnline.value = !isOnline.value;
}

onMounted(async () => {
  await loadVotes();

  // Simulate background sync
  syncInterval = setInterval(processQueue, 3000);
});

onUnmounted(() => {
  clearInterval(syncInterval);
});
</script>

<style>
body {
  font-family: system-ui, sans-serif;
  background-color: #4a9aa6;
}
</style>
