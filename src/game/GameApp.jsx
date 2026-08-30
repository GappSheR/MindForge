import React, { useState } from 'react';
import { Box } from '@mui/material';
import GameMenu from './GameMenu';
import GamePlay from './GamePlay';
import GameResults from './GameResults';

export default function GameApp() {
  const [screen, setScreen] = useState('menu');
  const [quiz, setQuiz] = useState(null);
  const [quizPath, setQuizPath] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [games, setGames] = useState([]);

  const handleLoadQuiz = (loadedQuiz, path) => {
    setQuiz(loadedQuiz);
    setQuizPath(path);
    setAnswers([]);
    setScore(0);
    setScreen('play');
  };

  const handleFinish = (finalScore, finalAnswers) => {
    setScore(finalScore);
    setAnswers(finalAnswers);
    setScreen('results');
  };

  const handleBackToMenu = () => {
    setQuiz(null);
    setQuizPath(null);
    setScreen('menu');
  };

  const handleLoadNew = () => {
    setQuiz(null);
    setQuizPath(null);
    setGames([]);
    setScreen('menu');
  };

  return (
    <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
      {screen === 'menu' && (
        <GameMenu
          games={games}
          onGamesChange={setGames}
          onLoadQuiz={handleLoadQuiz}
        />
      )}
      {screen === 'play' && quiz && (
        <GamePlay quiz={quiz} quizPath={quizPath} onFinish={handleFinish} />
      )}
      {screen === 'results' && quiz && (
        <GameResults
          quiz={quiz}
          score={score}
          total={quiz.questions.length}
          answers={answers}
          onRestart={handleBackToMenu}
          onLoadNew={handleLoadNew}
        />
      )}
    </Box>
  );
}
