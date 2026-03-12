<?php
/**
 * Task Voting API
 * GET /api/tasks/votes.php?task_id=1 - Get votes
 * POST /api/tasks/votes.php - Add/toggle vote
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../helpers/response.php';

Auth::verify();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = Database::getInstance()->getConnection();
    
    if ($method === 'GET') {
        $taskId = $_GET['task_id'] ?? null;
        if (!$taskId) {
            Response::error('Task ID is required', 400);
        }
        
        // Get vote count
        $stmt = $db->prepare("SELECT vote_count FROM tasks WHERE id = ?");
        $stmt->execute([$taskId]);
        $task = $stmt->fetch();
        
        // Get user's vote
        $stmt = $db->prepare("SELECT vote_type FROM task_votes WHERE task_id = ? AND user_id = ?");
        $stmt->execute([$taskId, Auth::$user['id']]);
        $userVote = $stmt->fetch();
        
        // Get voters
        $stmt = $db->prepare("
            SELECT tv.vote_type, u.id, u.name, u.avatar
            FROM task_votes tv
            JOIN users u ON tv.user_id = u.id
            WHERE tv.task_id = ?
        ");
        $stmt->execute([$taskId]);
        $voters = $stmt->fetchAll();
        
        Response::success([
            'vote_count' => (int)($task['vote_count'] ?? 0),
            'user_vote' => $userVote ? $userVote['vote_type'] : null,
            'has_voted' => !!$userVote,
            'voters' => $voters
        ]);
        
    } else if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $taskId = $input['task_id'] ?? null;
        $voteType = $input['vote_type'] ?? 'up';
        
        if (!$taskId) {
            Response::error('Task ID is required', 400);
        }
        
        // Check existing vote
        $stmt = $db->prepare("SELECT id, vote_type FROM task_votes WHERE task_id = ? AND user_id = ?");
        $stmt->execute([$taskId, Auth::$user['id']]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            // Toggle off (remove vote)
            $stmt = $db->prepare("DELETE FROM task_votes WHERE id = ?");
            $stmt->execute([$existing['id']]);
            
            // Update count
            $change = $existing['vote_type'] === 'up' ? -1 : 1;
            $db->prepare("UPDATE tasks SET vote_count = vote_count + ? WHERE id = ?")->execute([$change, $taskId]);
            
            Response::success(['action' => 'removed', 'user_vote' => null]);
        } else {
            // Add vote
            $stmt = $db->prepare("INSERT INTO task_votes (task_id, user_id, vote_type) VALUES (?, ?, ?)");
            $stmt->execute([$taskId, Auth::$user['id'], $voteType]);
            
            // Update count
            $change = $voteType === 'up' ? 1 : -1;
            $db->prepare("UPDATE tasks SET vote_count = vote_count + ? WHERE id = ?")->execute([$change, $taskId]);
            
            Response::success(['action' => 'added', 'user_vote' => $voteType]);
        }
        
    } else {
        Response::error('Method not allowed', 405);
    }

} catch (PDOException $e) {
    Response::error('Database error: ' . $e->getMessage(), 500);
}
