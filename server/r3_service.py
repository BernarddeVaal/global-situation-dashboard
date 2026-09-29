"""Loopback-only Tencent R3 retrieval. All model loading is offline and CPU based.

Prompts and two-stage flow follow Tencent/R3-Skill infer.py.
Only fixed local summary handlers execute; retrieved text is never evaluated as code.
"""
import os
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
import json
from pathlib import Path
from http.server import BaseHTTPRequestHandler, HTTPServer
import numpy as np
import torch
from sentence_transformers import SentenceTransformer, CrossEncoder

ROOT = Path(__file__).resolve().parents[1]
EMB_INSTR = 'Instruct: Given a user request, retrieve the agent skill that solves it.\nQuery: '
RR_INSTRUCT = 'Given a user request, retrieve the agent skill that solves it.'
SKILLS = json.loads((ROOT / 'assessment/skills.json').read_text(encoding='utf-8'))
torch.set_num_threads(min(8, os.cpu_count() or 1))
print('Loading local Tencent weights on CPU…', flush=True)
# No remote model code is executed. Standard Qwen3 support is provided by Transformers.
emb = SentenceTransformer(str(ROOT / 'models/r3-embedding'), device='cpu',
                          trust_remote_code=False, local_files_only=True)
emb.max_seq_length = 1024
rr = CrossEncoder(str(ROOT / 'models/r3-reranker'), device='cpu',
                  trust_remote_code=False, local_files_only=True)
rr.max_length = 1024
emb.eval()
rr.model.eval()
documents = [s['text'] for s in SKILLS]
with torch.inference_mode():
    vectors = emb.encode(documents, normalize_embeddings=True, show_progress_bar=False)


def summarize(skill, events):
    if skill['type'] == 'ALL':
        missing_sources = sum(not e.get('source') for e in events)
        return f'{len(events)} supplied records; {missing_sources} have no source label. Missing feeds do not demonstrate absence of events.'
    subset = [e for e in events if e.get('type') == skill['type']]
    result = f"{skill['id']} selected: {len(subset)} matching records. "
    if not subset:
        return result + 'No matching records in this snapshot; this does not imply no events exist.'
    key = 'magnitude' if skill['type'] == 'Earthquake' else 'cvss' if skill['type'] == 'CVE' else None
    if key:
        values = [e[key] for e in subset if isinstance(e.get(key), (float, int))]
        result += f'Highest supplied {key}: {max(values) if values else "unknown"}. '
    result += 'Examples: ' + '; '.join(str(e.get('title', 'Untitled')) for e in subset[:3])
    return result + '. Review aid only; no forecast or confirmation of local impact.'


def retrieve(question, events):
    # Bound the context: the question and first five records. Disclose this in output.
    context = [{k: e.get(k) for k in ('type', 'title', 'magnitude', 'cvss')} for e in events[:5]]
    query = question + '\nDashboard sample: ' + json.dumps(context, ensure_ascii=False)
    with torch.inference_mode():
        qv = emb.encode([EMB_INSTR + query], normalize_embeddings=True, show_progress_bar=False)
        cosine = (qv @ vectors.T)[0]
        indices = np.argsort(-cosine, kind='stable')[:4]
        pairs = [(query, documents[i]) for i in indices]
        scores = np.asarray(rr.predict(pairs, batch_size=1, prompt=RR_INSTRUCT,
                                       show_progress_bar=False)).reshape(-1)
    order = np.argsort(-scores, kind='stable')[:3]
    top = [{'id': SKILLS[indices[i]]['id'], 'score': float(scores[i]),
            'embeddingCosine': float(cosine[indices[i]])} for i in order]
    selected = SKILLS[indices[order[0]]]
    return {'model': 'C', 'models': ['tencent/R3-embedding-0.6b', 'tencent/R3-rerank-0.6b'],
            'method': 'local embedding recall then cross-encoder reranking', 'topSkills': top,
            'handlerResult': summarize(selected, events), 'queryUsed': query,
            'limitations': 'Routing uses the question plus the first five records. The selected fixed handler uses all records. Ranking scores are not calibrated probabilities.'}


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.reply(200 if self.path == '/health' else 404,
                   {'status': 'ready', 'inference': 'offline CPU'} if self.path == '/health' else {'error': 'Not found'})

    def do_POST(self):
        if self.path != '/retrieve':
            return self.reply(404, {'error': 'Not found'})
        try:
            size = int(self.headers.get('Content-Length', 0))
            if not 0 < size <= 5_000_000:
                return self.reply(413, {'error': 'Invalid request size'})
            data = json.loads(self.rfile.read(size))
            if not isinstance(data.get('question'), str) or not isinstance(data.get('events'), list):
                return self.reply(400, {'error': 'Question and event list required'})
            if len(data['events']) > 1000 or not all(isinstance(e, dict) for e in data['events']):
                return self.reply(400, {'error': 'Invalid event list'})
            self.reply(200, retrieve(data['question'][:600], data['events']))
        except (ValueError, KeyError, TypeError):
            self.reply(400, {'error': 'Invalid input'})
        except Exception as exc:
            print(f'R3 inference error: {exc}', flush=True)
            self.reply(500, {'error': 'Tencent inference failed; see local service output.'})


if __name__ == '__main__':
    print('Tencent R3-Skill ready at http://127.0.0.1:5051 (offline inference)', flush=True)
    HTTPServer(('127.0.0.1', 5051), Handler).serve_forever()
