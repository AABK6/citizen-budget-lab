import unittest
from unittest.mock import MagicMock, patch
import os
import json
import uuid
import time
from typing import Any, Dict, Optional

# We need to set the environment before importing votes_store to control get_settings behavior if needed,
# or we can patch get_settings.
# Here we'll patch the VoteStore classes and get_settings directly in the test.

from services.api.votes_store import (
    HybridVoteStore,
    PostgresVoteStore,
    FirestoreVoteStore,
    VoteSummary,
    _normalize_meta
)

class TestHybridVoteStore(unittest.TestCase):
    def setUp(self):
        self.mock_primary = MagicMock(spec=PostgresVoteStore)
        self.mock_secondary = MagicMock(spec=FirestoreVoteStore)
        self.hybrid_store = HybridVoteStore(self.mock_primary, self.mock_secondary)
        self.scenario_id = "scenario-123"
        self.user_email = "test@example.com"
        self.meta = {"region": "fr"}

    def test_add_vote_writes_to_both(self):
        """Test that adding a vote writes to both primary and secondary stores."""
        self.hybrid_store.add_vote(self.scenario_id, self.user_email, self.meta)
        
        self.mock_primary.add_vote.assert_called_once_with(self.scenario_id, self.user_email, self.meta)
        self.mock_secondary.add_vote.assert_called_once_with(self.scenario_id, self.user_email, self.meta)

    def test_add_vote_resilient_to_secondary_failure(self):
        """Test that if secondary fails, the operation still succeeds (best effort)."""
        self.mock_secondary.add_vote.side_effect = Exception("Firestore down")
        
        # Should not raise exception
        try:
            self.hybrid_store.add_vote(self.scenario_id, self.user_email, self.meta)
        except Exception:
            self.fail("HybridVoteStore raised exception on secondary failure")
            
        self.mock_primary.add_vote.assert_called_once()
        self.mock_secondary.add_vote.assert_called_once()

    def test_summary_reads_from_primary(self):
        """Test that summary is fetched from the primary store."""
        expected_summary = [VoteSummary(scenario_id="s1", votes=10, last_vote_ts=100.0)]
        self.mock_primary.summary.return_value = expected_summary
        
        result = self.hybrid_store.summary(limit=10)
        
        self.assertEqual(result, expected_summary)
        self.mock_primary.summary.assert_called_once_with(10)
        self.mock_secondary.summary.assert_not_called()

    def test_close_closes_both(self):
        self.hybrid_store.close()
        self.mock_primary.close.assert_called_once()
        self.mock_secondary.close.assert_called_once()


class TestPostgresVoteStore(unittest.TestCase):
    @patch('services.api.votes_store.apply_migrations')
    @patch('services.api.votes_store.votes_migrations_dir')
    def test_init_connects_and_migrates(self, mock_dir, mock_apply):
        mock_pool_cls = MagicMock()
        mock_pool = mock_pool_cls.return_value
        mock_conn = mock_pool.connection.return_value.__enter__.return_value
        
        # We need to patch the import in the module scope or where it's used.
        # Since it's imported inside __init__, we patch sys.modules or use patch.dict
        with patch.dict('sys.modules', {'psycopg_pool': MagicMock(ConnectionPool=mock_pool_cls)}):
            store = PostgresVoteStore("dsn", 1, 5, 30, 300, 1800)
            
            mock_pool_cls.assert_called_once()
            mock_pool.open.assert_called_once()
            mock_apply.assert_called_once()

    def test_add_vote_materialization(self):
        """Test that add_vote executes the correct SQL for upsert."""
        mock_pool_cls = MagicMock()
        mock_pool = mock_pool_cls.return_value
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        
        mock_pool.connection.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        
        with patch.dict('sys.modules', {'psycopg_pool': MagicMock(ConnectionPool=mock_pool_cls)}):
            with patch('services.api.votes_store.apply_migrations'):
                store = PostgresVoteStore("dsn", 1, 5, 30, 300, 1800)
                store.add_vote("scen1", "u@e.com", {})
                
                # Check calls
                # We expect 2 execute calls: one for insert vote, one for upsert stats
                self.assertEqual(mock_cursor.execute.call_count, 2)
                
                # Verify Upsert SQL (second call)
                args, _ = mock_cursor.execute.call_args_list[1]
                sql = args[0]
                self.assertIn("INSERT INTO vote_stats", sql)
                self.assertIn("ON CONFLICT (scenario_id) DO UPDATE", sql)

    def test_summary_reads_materialized_view(self):
        mock_pool_cls = MagicMock()
        mock_pool = mock_pool_cls.return_value
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [("s1", 5, 123.0)]
        
        mock_pool.connection.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        with patch.dict('sys.modules', {'psycopg_pool': MagicMock(ConnectionPool=mock_pool_cls)}):
             with patch('services.api.votes_store.apply_migrations'):
                store = PostgresVoteStore("dsn", 1, 5, 30, 300, 1800)
                res = store.summary(5)
                
                self.assertEqual(len(res), 1)
                self.assertEqual(res[0].votes, 5)
                
                # Check SQL used
                args, _ = mock_cursor.execute.call_args
                sql = args[0]
                self.assertIn("FROM vote_stats", sql)


class TestFirestoreVoteStore(unittest.TestCase):
    def test_add_vote_increments(self):
        mock_firestore = MagicMock()
        mock_client = mock_firestore.Client.return_value
        mock_col_votes = mock_client.collection.return_value
        mock_col_stats = mock_client.collection.return_value
        
        # Setup collection side effects to differentiate 'votes' vs 'vote_stats'
        def collection_side_effect(name):
            if name == "votes": return mock_col_votes
            if name == "vote_stats": return mock_col_stats
            return MagicMock()
        
        mock_client.collection.side_effect = collection_side_effect
        
        with patch.dict('sys.modules', {'google.cloud': MagicMock(firestore=mock_firestore)}):
            store = FirestoreVoteStore(project="p")
            store.add_vote("s1", "u", {})
            
            # Verify raw vote add
            mock_col_votes.add.assert_called_once()
            
            # Verify stats increment
            mock_col_stats.document.assert_called_with("s1")
            mock_col_stats.document.return_value.set.assert_called_once()
            
            # Check arguments for set (should contain Increment)
            args, _ = mock_col_stats.document.return_value.set.call_args
            data = args[0]
            self.assertIn("vote_count", data)
            # We can't easily check the type of Increment if it's mocked, but we check the call structure
            
if __name__ == '__main__':
    unittest.main()
