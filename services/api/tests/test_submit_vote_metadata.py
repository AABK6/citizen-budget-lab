from services.api import schema as gql_schema


SUBMIT_VOTE_MUTATION = """
mutation SubmitVote(
  $scenarioId: ID!,
  $respondentId: String,
  $sessionDurationSec: Float,
  $channel: String,
  $entryPath: String,
  $finalVoteSnapshotB64: String,
  $finalVoteSnapshotSha256: String,
  $finalVoteSnapshotVersion: Int,
  $finalVoteSnapshotTruncated: Boolean
) {
  submitVote(
    scenarioId: $scenarioId,
    respondentId: $respondentId,
    sessionDurationSec: $sessionDurationSec,
    channel: $channel,
    entryPath: $entryPath,
    finalVoteSnapshotB64: $finalVoteSnapshotB64,
    finalVoteSnapshotSha256: $finalVoteSnapshotSha256,
    finalVoteSnapshotVersion: $finalVoteSnapshotVersion,
    finalVoteSnapshotTruncated: $finalVoteSnapshotTruncated
  )
}
"""


class _DummyVoteStore:
    def __init__(self) -> None:
        self.calls = []

    def add_vote(self, scenario_id, user_email, meta):
        self.calls.append(
            {
                "scenario_id": scenario_id,
                "user_email": user_email,
                "meta": meta,
            }
        )


def test_submit_vote_persists_qualtrics_metadata(monkeypatch):
    store = _DummyVoteStore()
    monkeypatch.setattr("services.api.votes_store.get_vote_store", lambda: store)

    variables = {
        "scenarioId": "scenario-qualtrics-1",
        "respondentId": "panel-abc-123",
        "sessionDurationSec": 42.5,
        "channel": "qualtrics",
        "entryPath": "/build?source=qualtrics&ID=panel-abc-123",
        "finalVoteSnapshotB64": "eyJ2IjoxfQ",
        "finalVoteSnapshotSha256": "a" * 64,
        "finalVoteSnapshotVersion": 1,
        "finalVoteSnapshotTruncated": False,
    }

    result = gql_schema.schema.execute_sync(
        SUBMIT_VOTE_MUTATION,
        variable_values=variables,
    )
    assert not result.errors
    assert result.data["submitVote"] is True
    assert len(store.calls) == 1

    call = store.calls[0]
    assert call["scenario_id"] == "scenario-qualtrics-1"
    meta = call["meta"]
    assert meta["respondentId"] == "panel-abc-123"
    assert meta["sessionDurationSec"] == 42.5
    assert meta["channel"] == "qualtrics"
    assert meta["entryPath"] == "/build?source=qualtrics&ID=panel-abc-123"
    assert meta["finalVoteSnapshotB64"] == "eyJ2IjoxfQ"
    assert meta["finalVoteSnapshotSha256"] == "a" * 64
    assert meta["finalVoteSnapshotVersion"] == 1
    assert meta["finalVoteSnapshotTruncated"] is False
    assert "timestamp" in meta


def test_submit_vote_sanitizes_invalid_metadata(monkeypatch, caplog):
    store = _DummyVoteStore()
    monkeypatch.setattr("services.api.votes_store.get_vote_store", lambda: store)

    variables = {
        "scenarioId": "scenario-qualtrics-2",
        "respondentId": "x" * 512,
        "sessionDurationSec": -5.0,
        "channel": "not-a-valid-channel",
        "entryPath": "/" + ("x" * 3000),
        "finalVoteSnapshotB64": "%%%NOT_BASE64%%%",
        "finalVoteSnapshotSha256": "invalid-sha",
        "finalVoteSnapshotVersion": 0,
        "finalVoteSnapshotTruncated": True,
    }

    with caplog.at_level("WARNING"):
        result = gql_schema.schema.execute_sync(
            SUBMIT_VOTE_MUTATION,
            variable_values=variables,
        )

    assert not result.errors
    assert result.data["submitVote"] is True
    assert len(store.calls) == 1

    meta = store.calls[0]["meta"]
    # Invalid fields are dropped.
    assert "respondentId" not in meta
    assert "sessionDurationSec" not in meta
    assert "entryPath" not in meta
    assert "finalVoteSnapshotB64" not in meta
    assert "finalVoteSnapshotSha256" not in meta
    assert "finalVoteSnapshotVersion" not in meta
    # Invalid channel is normalized.
    assert meta["channel"] == "unknown"
    # Explicit flag is preserved.
    assert meta["finalVoteSnapshotTruncated"] is True
    assert "timestamp" in meta

    assert "submitVote metadata validation warnings" in caplog.text
