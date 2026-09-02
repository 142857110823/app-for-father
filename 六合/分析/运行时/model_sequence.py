from __future__ import annotations

import random

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F


WINDOW_SIZE = 30
NUM_CANDIDATES = 49
TCN_HIDDEN_DIM = 32
BPR_CONTEXT_DIM = 16
TCN_TRAIN_STEPS = 24
BPR_TRAIN_STEPS = 18
TCN_LEARNING_RATE = 0.01
BPR_LEARNING_RATE = 0.02

REQUIRED_SPLIT_KEYS = {
    "draws",
    "samples",
    "matrix",
    "labels",
    "feature_names",
    "candidate_numbers",
    "draw_count",
    "sample_count",
}


def _set_seed(seed):
    seed = int(seed)
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.set_num_threads(1)
    try:  # pragma: no cover - availability depends on torch build
        torch.use_deterministic_algorithms(True)
    except Exception:
        pass
    if torch.backends.cudnn.is_available():  # pragma: no cover - CPU in tests
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False


def _require_split(split):
    if not isinstance(split, dict):
        raise ValueError("split must be a dictionary")
    missing = sorted(REQUIRED_SPLIT_KEYS - set(split))
    if missing:
        raise ValueError(f"split is missing required keys: {', '.join(missing)}")
    draw_count = int(split["draw_count"])
    sample_count = int(split["sample_count"])
    draws = split["draws"]
    samples = split["samples"]
    labels = split["labels"]
    matrix = split["matrix"]
    feature_names = split["feature_names"]
    candidate_numbers = split["candidate_numbers"]
    if draw_count != len(draws):
        raise ValueError("draw_count must match the number of draws")
    if sample_count != len(samples) or sample_count != len(matrix) or sample_count != len(labels):
        raise ValueError("sample_count must match samples, matrix, and labels")
    if sample_count != draw_count * NUM_CANDIDATES:
        raise ValueError("sample_count must equal draw_count * 49")
    if len(candidate_numbers) != NUM_CANDIDATES:
        raise ValueError("split must contain exactly 49 candidate numbers")
    if not feature_names:
        raise ValueError("split must include feature_names")
    return draws


def _draw_state(draw):
    labels = draw.get("labels")
    if labels is None or len(labels) != NUM_CANDIDATES:
        raise ValueError("each draw must contain 49 labels")
    state = [float(value) for value in labels]
    if any(value not in (0.0, 1.0) for value in state):
        raise ValueError("draw labels must be binary")
    return state


def _build_draw_states(draws):
    return np.asarray([_draw_state(draw) for draw in draws], dtype=np.float32)


def _causal_conv1d(layer, inputs):
    kernel_size = int(layer.kernel_size[0])
    dilation = int(layer.dilation[0])
    padding = dilation * (kernel_size - 1)
    padded = F.pad(inputs, (padding, 0))
    return layer(padded)


class _TCNBaselineNet(nn.Module):
    def __init__(self, input_width=NUM_CANDIDATES, hidden_width=TCN_HIDDEN_DIM, output_width=NUM_CANDIDATES):
        super().__init__()
        self.conv1 = nn.Conv1d(input_width, hidden_width, kernel_size=3, dilation=1)
        self.conv2 = nn.Conv1d(hidden_width, hidden_width, kernel_size=3, dilation=2)
        self.head = nn.Linear(hidden_width, output_width)

    def forward(self, inputs):
        x = inputs.transpose(1, 2)
        x = torch.relu(_causal_conv1d(self.conv1, x))
        x = torch.relu(_causal_conv1d(self.conv2, x))
        x = x[:, :, -1]
        return self.head(x)


class _BPRBaselineNet(nn.Module):
    def __init__(self, context_width, context_dim=BPR_CONTEXT_DIM, item_dim=BPR_CONTEXT_DIM):
        super().__init__()
        self.context_encoder = nn.Sequential(
            nn.Linear(context_width, context_dim),
            nn.Tanh(),
            nn.Linear(context_dim, context_dim),
        )
        self.item_embeddings = nn.Embedding(NUM_CANDIDATES, item_dim)
        self.item_bias = nn.Embedding(NUM_CANDIDATES, 1)

    def score(self, context, item_indices):
        context_vec = self.context_encoder(context)
        item_vec = self.item_embeddings(item_indices)
        bias = self.item_bias(item_indices).squeeze(-1)
        return (context_vec * item_vec).sum(dim=-1) + bias


def _training_contexts(draw_states, window_size):
    if len(draw_states) <= window_size:
        raise ValueError(f"train_split must contain more than {window_size} draws")
    contexts = []
    targets = []
    for index in range(window_size, len(draw_states)):
        contexts.append(draw_states[index - window_size : index])
        targets.append(draw_states[index])
    return np.asarray(contexts, dtype=np.float32), np.asarray(targets, dtype=np.float32)


def _last_window(draw_states, window_size):
    if len(draw_states) < window_size:
        raise ValueError("split does not provide enough history to build a full window")
    return np.asarray(draw_states[-window_size:], dtype=np.float32)


def _frozen_history_window(model, split):
    draws = _require_split(split)
    history_states = np.asarray(model["history_states"], dtype=np.float32)
    if history_states.ndim != 2 or history_states.shape[1] != NUM_CANDIDATES:
        raise ValueError("model history_states must be a frozen 2D window")
    if len(history_states) < WINDOW_SIZE:
        raise ValueError("model history_states must contain a full window")
    return draws, history_states


def fit_tcn_baseline(train_split, seed=20260902):
    draws = _require_split(train_split)
    _set_seed(seed)
    draw_states = _build_draw_states(draws)
    contexts, targets = _training_contexts(draw_states, WINDOW_SIZE)
    if len(contexts) == 0:
        raise ValueError("train_split does not contain enough draws for the TCN window")

    model = _TCNBaselineNet()
    optimizer = torch.optim.Adam(model.parameters(), lr=TCN_LEARNING_RATE)
    criterion = nn.BCEWithLogitsLoss()
    inputs = torch.tensor(contexts, dtype=torch.float32)
    labels = torch.tensor(targets, dtype=torch.float32)

    for _ in range(TCN_TRAIN_STEPS):
        optimizer.zero_grad(set_to_none=True)
        logits = model(inputs)
        loss = criterion(logits, labels)
        loss.backward()
        optimizer.step()

    return {
        "model_type": "tcn_baseline",
        "seed": int(seed),
        "window_size": WINDOW_SIZE,
        "train_steps": TCN_TRAIN_STEPS,
        "learning_rate": TCN_LEARNING_RATE,
        "hidden_dim": TCN_HIDDEN_DIM,
        "holdout_update_mode": "frozen_train_history",
        "network": model,
        "history_states": draw_states[-WINDOW_SIZE:].tolist(),
        "metadata": {
            "window_size": WINDOW_SIZE,
            "seed": int(seed),
            "train_steps": TCN_TRAIN_STEPS,
            "learning_rate": TCN_LEARNING_RATE,
            "hidden_dim": TCN_HIDDEN_DIM,
            "holdout_update_mode": "frozen_train_history",
            "train_draw_count": int(train_split["draw_count"]),
        },
    }


def fit_bpr_baseline(train_split, seed=20260902):
    draws = _require_split(train_split)
    _set_seed(seed)
    draw_states = _build_draw_states(draws)
    contexts, targets = _training_contexts(draw_states, WINDOW_SIZE)
    if len(contexts) == 0:
        raise ValueError("train_split does not contain enough draws for the BPR window")

    rng = random.Random(int(seed))
    pair_contexts = []
    pair_positives = []
    pair_negatives = []

    for context, target in zip(contexts, targets):
        positives = [index for index, value in enumerate(target) if value > 0.5]
        negatives = [index for index, value in enumerate(target) if value < 0.5]
        if not positives or not negatives:
            raise ValueError("each training draw must contain both positive and negative labels")
        sampled_negatives = _sample_negatives_with_replacement(rng, negatives, len(positives))
        for positive, negative in zip(positives, sampled_negatives):
            pair_contexts.append(context.reshape(-1))
            pair_positives.append(positive)
            pair_negatives.append(negative)

    model = _BPRBaselineNet(context_width=WINDOW_SIZE * NUM_CANDIDATES)
    optimizer = torch.optim.Adam(model.parameters(), lr=BPR_LEARNING_RATE)
    context_tensor = torch.tensor(np.asarray(pair_contexts, dtype=np.float32), dtype=torch.float32)
    positive_tensor = torch.tensor(pair_positives, dtype=torch.long)
    negative_tensor = torch.tensor(pair_negatives, dtype=torch.long)

    for _ in range(BPR_TRAIN_STEPS):
        optimizer.zero_grad(set_to_none=True)
        positive_scores = model.score(context_tensor, positive_tensor)
        negative_scores = model.score(context_tensor, negative_tensor)
        loss = F.softplus(-(positive_scores - negative_scores)).mean()
        loss.backward()
        optimizer.step()

    return {
        "model_type": "bpr_baseline",
        "seed": int(seed),
        "window_size": WINDOW_SIZE,
        "train_steps": BPR_TRAIN_STEPS,
        "learning_rate": BPR_LEARNING_RATE,
        "context_dim": BPR_CONTEXT_DIM,
        "embedding_dim": BPR_CONTEXT_DIM,
        "holdout_update_mode": "frozen_train_history",
        "network": model,
        "history_states": draw_states[-WINDOW_SIZE:].tolist(),
        "metadata": {
            "window_size": WINDOW_SIZE,
            "seed": int(seed),
            "train_steps": BPR_TRAIN_STEPS,
            "learning_rate": BPR_LEARNING_RATE,
            "context_dim": BPR_CONTEXT_DIM,
            "embedding_dim": BPR_CONTEXT_DIM,
            "holdout_update_mode": "frozen_train_history",
            "train_draw_count": int(train_split["draw_count"]),
            "pair_count": len(pair_contexts),
        },
    }


def _sample_negatives_with_replacement(rng, negatives, count):
    if count < 0:
        raise ValueError("count must be non-negative")
    if not negatives:
        raise ValueError("negatives must not be empty")
    pool = list(negatives)
    sampled = []
    while len(sampled) < count:
        sampled.append(pool[rng.randrange(len(pool))])
    return sampled


def _predict_tcn(model, split):
    draws, history_states = _frozen_history_window(model, split)
    if len(draws) < 2:
        raise ValueError("split must contain at least two draws")
    network = model["network"]
    network.eval()
    predictions = []
    with torch.no_grad():
        context = torch.tensor(history_states[None, :, :], dtype=torch.float32)
        logits = network(context)
        row = torch.sigmoid(logits).squeeze(0).clamp(0.0, 1.0).tolist()
        for _draw in draws:
            predictions.append([float(value) for value in row])
    return predictions


def _predict_bpr(model, split):
    draws, history_states = _frozen_history_window(model, split)
    if len(draws) < 2:
        raise ValueError("split must contain at least two draws")
    network = model["network"]
    network.eval()
    predictions = []
    with torch.no_grad():
        context_tensor = torch.tensor(history_states.reshape(1, -1), dtype=torch.float32)
        for _draw in draws:
            item_indices = torch.arange(NUM_CANDIDATES, dtype=torch.long)
            scores = network.score(context_tensor.repeat(NUM_CANDIDATES, 1), item_indices)
            row = torch.sigmoid(scores).clamp(0.0, 1.0).tolist()
            predictions.append([float(value) for value in row])
    return predictions


def predict_sequence_model(model, split):
    if not isinstance(model, dict) or "model_type" not in model:
        raise ValueError("model must be a sequence-model dictionary with model_type")
    model_type = model["model_type"]
    if model_type == "tcn_baseline":
        return _predict_tcn(model, split)
    if model_type == "bpr_baseline":
        return _predict_bpr(model, split)
    raise ValueError(f"unsupported model_type: {model_type}")
