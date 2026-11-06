<script>
  let { node, onchange } = $props();
  let urlInput = $state('');
  let fileInput = $state(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      node.data.src = reader.result;
      node.data.alt = file.name;
      onchange();
    };
    reader.readAsDataURL(file);
  }

  function applyUrl() {
    if (!urlInput.trim()) return;
    node.data.src = urlInput.trim();
    onchange();
  }

  function removeImage() {
    node.data.src = '';
    onchange();
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        node.data.src = reader.result;
        node.data.alt = file.name;
        onchange();
      };
      reader.readAsDataURL(file);
    }
  }
</script>

<div class="image-node" ondragover={(e) => e.preventDefault()} ondrop={handleDrop}>
  {#if node.data.src}
    <div class="preview">
      <img src={node.data.src} alt={node.data.alt || ''} />
      <button class="remove" onclick={removeImage} title="移除圖片">×</button>
    </div>
  {:else}
    <div class="uploader">
      <p>🖼 拖曳圖片到此處、貼上網址，或選擇檔案</p>
      <div class="row">
        <input
          type="text"
          placeholder="貼上圖片網址..."
          bind:value={urlInput}
          onkeydown={(e) => e.key === 'Enter' && applyUrl()}
        />
        <button onclick={applyUrl}>套用</button>
      </div>
      <div class="row">
        <label class="file-btn">
          選擇檔案
          <input type="file" accept="image/*" onchange={handleFile} />
        </label>
      </div>
    </div>
  {/if}
</div>

<style>
  .image-node {
    margin: 8px 0;
  }
  .preview {
    position: relative;
    display: inline-block;
    max-width: 100%;
  }
  .preview img {
    max-width: 100%;
    max-height: 400px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    display: block;
  }
  .remove {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(0,0,0,0.6);
    color: white;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .uploader {
    border: 2px dashed var(--border);
    border-radius: var(--radius);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 13px;
  }
  .row {
    display: flex;
    gap: 6px;
  }
  .row input[type="text"] {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    font-size: 13px;
    outline: none;
  }
  .row input[type="text"]:focus {
    border-color: var(--accent);
  }
  .row button {
    padding: 6px 12px;
    background: var(--accent);
    color: white;
    border-radius: 4px;
    font-size: 13px;
  }
  .file-btn {
    padding: 6px 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text);
  }
  .file-btn input {
    display: none;
  }
</style>