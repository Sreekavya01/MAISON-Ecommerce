import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const products = [
  ['satin-wrap-midi-dress', 'satin dress'],
  ['embroidered-cotton-kurta-set', 'embroidered kurta'],
  ['cropped-denim-jacket', 'denim jacket'],
  ['pleated-office-trousers', 'women trousers'],
  ['ribbed-knit-co-ord-set', 'knit outfit'],
  ['linen-nehru-jacket', 'nehru jacket'],
  ['tailored-chino-trousers', 'chino trousers'],
  ['merino-crew-neck-sweater', 'crew sweater'],
  ['lightweight-bomber-jacket', 'bomber jacket'],
  ['textured-polo-t-shirt', 'polo shirt'],
  ['suede-penny-loafers', 'penny loafers'],
  ['cushioned-running-shoes', 'running shoes'],
  ['leather-chelsea-boots', 'chelsea boots'],
  ['strappy-block-heel-sandals', 'heel sandals'],
  ['everyday-slide-sandals', 'slide sandals'],
  ['structured-work-tote', 'tote bag'],
  ['minimalist-leather-wallet', 'leather wallet'],
  ['canvas-travel-backpack', 'travel backpack'],
  ['polarized-aviator-sunglasses', 'aviator sunglasses'],
  ['classic-reversible-belt', 'leather belt'],
  ['portable-bluetooth-speaker', 'bluetooth speaker'],
  ['noise-cancelling-earbuds', 'wireless earbuds'],
  ['fast-charge-power-bank', 'power bank'],
  ['compact-mechanical-keyboard', 'mechanical keyboard'],
  ['full-hd-webcam', 'computer webcam'],
  ['digital-air-fryer', 'air fryer'],
  ['compact-drip-coffee-maker', 'coffee maker'],
  ['handheld-garment-steamer', 'clothes steamer'],
  ['quiet-bedside-air-purifier', 'air purifier'],
  ['ceramic-electric-kettle', 'electric kettle'],
  ['wooden-activity-cube', 'activity cube'],
  ['remote-control-stunt-car', 'toy car'],
  ['kids-art-craft-studio-kit', 'art supplies'],
  ['interactive-musical-learning-mat', 'music mat'],
  ['beginner-science-experiment-kit', 'science kit'],
];

const outputDirectory = join('tmp', 'catalog-image-qa');
mkdirSync(outputDirectory, { recursive: true });

const selectedIds = new Set();
const results = [];

for (const [slug, query] of products) {
  const response = await fetch(
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=20&mature=false`
  );

  if (!response.ok) {
    throw new Error(`${slug}: Openverse search returned ${response.status}`);
  }

  const payload = await response.json();
  const candidates = (payload.results || [])
    .filter((photo) => photo.url && photo.thumbnail)
    .map((photo) => ({
      id: photo.id,
      description: photo.title || '',
      url: photo.url,
      thumb: photo.thumbnail,
      photographer: photo.creator || '',
      source: photo.foreign_landing_url || '',
      license: photo.license || '',
      width: photo.width || 0,
      height: photo.height || 0,
    }));

  const selected = candidates.find((candidate) => !selectedIds.has(candidate.id));

  if (!selected) {
    throw new Error(
      `${slug}: no unique image candidate found (${JSON.stringify(payload).slice(0, 500)})`
    );
  }

  selectedIds.add(selected.id);

  const imageResponse = await fetch(selected.thumb);
  if (!imageResponse.ok) {
    throw new Error(`${slug}: image download returned ${imageResponse.status}`);
  }

  writeFileSync(
    join(outputDirectory, `${slug}.jpg`),
    Buffer.from(await imageResponse.arrayBuffer())
  );

  results.push({ slug, query, selected, candidates: candidates.slice(0, 5) });
  console.log(`${slug}: ${selected.id} — ${selected.description || 'No description'}`);
}

writeFileSync(
  join(outputDirectory, 'selections.json'),
  JSON.stringify(results, null, 2)
);

console.log(`Prepared ${results.length} unique image candidates.`);
