"""Download actual Tencent weights once; inference runs offline afterwards."""
import os
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
from pathlib import Path
from huggingface_hub import snapshot_download

root = Path(__file__).resolve().parents[1] / 'models'
for repo, folder in [('tencent/R3-embedding-0.6b', 'r3-embedding'),
                     ('tencent/R3-rerank-0.6b', 'r3-reranker')]:
    path = snapshot_download(repo_id=repo, local_dir=root / folder)
    print(f'Downloaded {repo} to {path}', flush=True)
