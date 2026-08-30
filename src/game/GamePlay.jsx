import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, LinearProgress, IconButton,
} from '@mui/material';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import TimerDisplay from '../components/TimerDisplay';

export default function GamePlay({ quiz, quizPath, onFinish }) {
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [timer, setTimer] = useState(0);
  const [phase, setPhase] = useState('question'); // 'before-event' | 'question' | 'after-event'
  const [eventIdx, setEventIdx] = useState(0);
  const [eventQueue, setEventQueue] = useState([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const audioRef = useRef(null);

  const total = quiz.questions.length;
  const question = quiz.questions[qIdx];
  const resolvedMedia = quiz.resolvedMedia || {};

  // Build event queue for current question
  useEffect(() => {
    if (!quiz.timeline || !question) return;
    const entry = quiz.timeline[qIdx] || { before: [], after: [] };
    const queue = [];
    (entry.before || []).forEach((ev, i) => queue.push({ ...ev, side: 'before', idx: i }));
    (entry.after || []).forEach((ev, i) => queue.push({ ...ev, side: 'after', idx: i }));
    setEventQueue(queue);
  }, [qIdx]);

  // Start event queue when entering before-event phase
  useEffect(() => {
    if (phase !== 'before-event' && phase !== 'after-event') return;
    const side = phase === 'before-event' ? 'before' : 'after';
    const entry = (quiz.timeline[qIdx] || {})[side] || [];
    if (entry.length === 0 || eventIdx >= entry.length) {
      if (side === 'before') {
        setPhase('question');
      } else {
        goNext();
      }
      return;
    }
    const ev = entry[eventIdx];
    const duration = (ev.duration || 5) * 1000;
    const timer = setTimeout(() => {
      if (eventIdx + 1 < entry.length) {
        setEventIdx(eventIdx + 1);
      } else {
        if (side === 'before') {
          setPhase('question');
        } else {
          goNext();
        }
      }
    }, duration);
    return () => clearTimeout(timer);
  }, [phase, eventIdx, qIdx]);

  // Start question timer
  useEffect(() => {
    if (phase !== 'question' || answered || !question) return;

    // Play question music
    if (question.music && resolvedMedia[question.music.name]) {
      try {
        audioRef.current = new Audio(resolvedMedia[question.music.name]);
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(() => {});
      } catch (e) {}
    }

    const qTimer = question.timer || 30;
    setTimer(qTimer);
    startTimeRef.current = Date.now();

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, qTimer - elapsed);
      setTimer(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        handleTimeout();
      }
    }, 100);

    timerRef.current = interval;
    return () => {
      clearInterval(interval);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [qIdx, phase]);

  const handleTimeout = () => {
    if (answered) return;
    setAnswered(true);
    const q = quiz.questions[qIdx];
    const newAnswers = [...answers, { qIdx, selected: -1, correct: q.correct, timeLeft: 0 }];
    setAnswers(newAnswers);
    setTimeout(() => {
      setPhase('after-event');
      setEventIdx(0);
    }, 1500);
  };

  const selectAnswer = (idx) => {
    if (answered) return;
    setAnswered(true);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    clearInterval(timerRef.current);
    const q = quiz.questions[qIdx];
    const correct = idx === q.correct;
    if (correct) setScore(s => s + 1);
    const timeLeft = Math.max(0, timer);
    const newAnswers = [...answers, { qIdx, selected: idx, correct: q.correct, timeLeft }];
    setAnswers(newAnswers);
    setTimeout(() => {
      setPhase('after-event');
      setEventIdx(0);
    }, 1500);
  };

  const goNext = () => {
    const nextIdx = qIdx + 1;
    if (nextIdx >= total) {
      onFinish(score, answers);
      return;
    }
    setQIdx(nextIdx);
    setAnswered(false);
    setEventIdx(0);
    setPhase('before-event');
  };

  const skipEvent = () => {
    const side = phase === 'before-event' ? 'before' : 'after';
    const entry = (quiz.timeline[qIdx] || {})[side] || [];
    if (eventIdx + 1 < entry.length) {
      setEventIdx(eventIdx + 1);
    } else {
      if (side === 'before') {
        setPhase('question');
      } else {
        goNext();
      }
    }
  };

  if (!question) {
    return <Typography>Загрузка...</Typography>;
  }

  const pct = ((qIdx + (answered ? 1 : 0)) / total) * 100;

  // ─── RENDER: Event (presentation / video) ─────────────────────────────
  if (phase === 'before-event' || phase === 'after-event') {
    const side = phase === 'before-event' ? 'before' : 'after';
    const entry = (quiz.timeline[qIdx] || {})[side] || [];
    if (entry.length === 0 || eventIdx >= entry.length) {
      if (side === 'before') return null; // will transition to question
      return null; // will transition to next
    }
    const ev = entry[eventIdx];
    const fileRef = ev.file || '';
    const mediaName = fileRef.startsWith('media/') ? fileRef.substring(6) : fileRef;
    const blobUrl = resolvedMedia[mediaName] || resolvedMedia[fileRef];
    const ext = (mediaName.split('.').pop() || '').toLowerCase();
    const isVideo = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'webm'].includes(ext);

    return (
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {side === 'before' ? 'Перед вопросом' : 'После вопроса'} {qIdx + 1}
          </Typography>
          <IconButton onClick={skipEvent} sx={{ color: '#00D4FF' }}>
            <SkipNextIcon />
          </IconButton>
        </Box>
        {blobUrl && isVideo ? (
          <Box
            component="video"
            src={blobUrl}
            controls
            autoPlay
            sx={{ maxWidth: '90%', maxHeight: '80%', borderRadius: 2 }}
          />
        ) : blobUrl ? (
          <Box sx={{
            width: '80%', height: '70%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: '#111', borderRadius: 2, overflow: 'hidden',
          }}>
            <Box
              component="iframe"
              src={blobUrl}
              sx={{ width: '100%', height: '100%', border: 'none' }}
            />
          </Box>
        ) : (
          <Typography variant="h4" color="text.secondary">{mediaName || 'Медиа не найдено'}</Typography>
        )}
      </Box>
    );
  }

  // ─── RENDER: Question ─────────────────────────────────────────────────
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Progress */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Вопрос {qIdx + 1} из {total}
        </Typography>
        <LinearProgress variant="determinate" value={pct} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
        <TimerDisplay seconds={timer} total={question.timer} />
      </Box>

      {/* Question card */}
      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }} elevation={4}>
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
          {/* Question image */}
          {question.image && resolvedMedia[question.image.name] && (
            <Box sx={{ mb: 2, textAlign: 'center' }}>
              <Box
                component="img"
                src={resolvedMedia[question.image.name]}
                alt={question.image.name}
                sx={{ maxHeight: 200, maxWidth: '100%', borderRadius: 2, objectFit: 'contain' }}
              />
            </Box>
          )}

          <Typography variant="h4" sx={{ fontWeight: 700, mb: 3, textAlign: 'center' }}>
            {question.text}
          </Typography>

          {/* Options */}
          <Grid container spacing={2} sx={{ flex: 1, alignContent: 'center' }}>
            {question.options.map((opt, i) => {
              let variant = 'outlined';
              let bg = 'transparent';
              if (answered) {
                if (i === question.correct) {
                  variant = 'contained';
                  bg = 'success.main';
                } else if (i === answers[answers.length - 1]?.selected && i !== question.correct) {
                  variant = 'contained';
                  bg = 'error.main';
                }
              }
              return (
                <Grid item xs={12} sm={6} key={i}>
                  <Button
                    variant={variant}
                    fullWidth
                    disabled={answered}
                    onClick={() => selectAnswer(i)}
                    sx={{
                      height: 80, fontSize: '1.1rem', textTransform: 'none',
                      bgcolor: answered ? bg : undefined,
                      borderColor: answered && i === question.correct ? 'success.main' : undefined,
                      '&:hover': answered ? {} : { borderColor: '#00D4FF', bgcolor: 'rgba(0,212,255,0.08)' },
                    }}
                  >
                    {opt}
                  </Button>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
