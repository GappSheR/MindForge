import JSZip from 'jszip';

export const SUPPORTED_IMAGES = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
export const SUPPORTED_AUDIO = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'];
export const SUPPORTED_VIDEO = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.webm'];
export const SUPPORTED_PRESENTATIONS = [
  '.pptx', '.ppt', '.pps', '.ppsx', '.pdf', '.key', '.odp',
  '.fodp', '.odg', '.wps', '.html', '.md',
];

export function createEmptyQuiz() {
  return {
    metadata: { title: 'Новая викторина', author: 'GappSheRVIP777', description: '', version: '1.0', icon: null, iconPath: null },
    questions: [],
    slides: [],
    timeline: [],
    media: [],
  };
}

export function createDefaultQuestion(index) {
  return {
    id: `q_${Date.now()}_${index}`,
    text: `Новый вопрос ${index + 1}`,
    options: ['Вариант 1', 'Вариант 2', 'Вариант 3', 'Вариант 4'],
    correct: 0,
    timer: 30,
    image: null,
    music: null,
  };
}

export function createDefaultSlide(index) {
  return {
    id: `s_${Date.now()}_${index}`,
    title: `Слайд ${index + 1}`,
    text: '',
    bgColor: '#2B2B2B',
    textColor: '#FFFFFF',
    image: null,
  };
}

export function createDefaultTimelineEvent(type = 'slide', file = '') {
  return { type, file, duration: 5 };
}

async function readFileData(filePath) {
  if (window.electronAPI) {
    const data = await window.electronAPI.readFile(filePath);
    return new Uint8Array(data);
  }
  const resp = await fetch(filePath);
  return new Uint8Array(await resp.arrayBuffer());
}

export async function saveQuiz(quiz, mediaFiles, zipPath) {
  const zip = new JSZip();
  const mediaFolder = zip.folder('media');

  // Add media files from Media panel
  for (const mf of mediaFiles) {
    try {
      if (mf.raw) {
        const data = await mf.raw.async('uint8array');
        mediaFolder.file(mf.name, data);
      } else if (mf.path) {
        const data = await readFileData(mf.path);
        mediaFolder.file(mf.name, data);
      }
    } catch (e) {
      console.warn('Media skip:', mf.name, e);
    }
  }

  // Add slide files
  for (const s of quiz.slides) {
    if (s.file) {
      const fileName = s.name || s.file.split(/[/\\]/).pop();
      if (!mediaFolder.file(fileName)) {
        try {
          const data = await readFileData(s.file);
          mediaFolder.file(fileName, data);
        } catch (e) {
          console.warn('Slide file skip:', fileName, e);
        }
      }
    }
  }

  // Add question images and music
  for (const q of quiz.questions) {
    if (q.image && q.image.path) {
      const fileName = q.image.name || q.image.path.split(/[/\\]/).pop();
      if (!mediaFolder.file(fileName)) {
        try {
          const data = await readFileData(q.image.path);
          mediaFolder.file(fileName, data);
        } catch (e) {
          console.warn('Question image skip:', fileName, e);
        }
      }
    }
    if (q.music && q.music.path) {
      const fileName = q.music.name || q.music.path.split(/[/\\]/).pop();
      if (!mediaFolder.file(fileName)) {
        try {
          const data = await readFileData(q.music.path);
          mediaFolder.file(fileName, data);
        } catch (e) {
          console.warn('Question music skip:', fileName, e);
        }
      }
    }
  }

  // Add icon file
  if (quiz.metadata.icon && quiz.metadata.iconPath) {
    try {
      const data = await readFileData(quiz.metadata.iconPath);
      mediaFolder.file(quiz.metadata.icon, data);
    } catch (e) {
      console.warn('Icon skip:', e);
    }
  }

  // Save metadata (strip iconPath for serialization)
  const metaForFile = { ...quiz.metadata };
  delete metaForFile.iconPath;
  zip.file('metadata.json', JSON.stringify(metaForFile, null, 2));
  zip.file('questions.json', JSON.stringify(quiz.questions, null, 2));
  zip.file('slides.json', JSON.stringify(quiz.slides, null, 2));
  zip.file('timeline.json', JSON.stringify(quiz.timeline, null, 2));

  const blob = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  if (window.electronAPI) {
    await window.electronAPI.writeFile(zipPath, Array.from(blob));
  }
  return zipPath;
}

export async function loadQuiz(zipPath) {
  let data;
  if (window.electronAPI) {
    data = await window.electronAPI.readFile(zipPath);
  } else {
    const resp = await fetch(zipPath);
    data = new Uint8Array(await resp.arrayBuffer());
  }
  const zip = await JSZip.loadAsync(data);
  const metadata = JSON.parse(await zip.file('metadata.json').async('text'));
  const questions = JSON.parse(await zip.file('questions.json').async('text'));
  const slides = zip.file('slides.json')
    ? JSON.parse(await zip.file('slides.json').async('text'))
    : [];
  const timeline = zip.file('timeline.json')
    ? JSON.parse(await zip.file('timeline.json').async('text'))
    : [];
  const media = [];
  const mediaFolder = zip.folder('media');
  if (mediaFolder) {
    mediaFolder.forEach((relPath, zipEntry) => {
      if (!zipEntry.dir) {
        media.push({ name: relPath, data: zipEntry });
      }
    });
  }
  return { metadata, questions, slides, timeline, media, zip };
}

export function getMediaCategory(ext) {
  ext = ext.toLowerCase();
  if (SUPPORTED_IMAGES.includes(ext)) return 'image';
  if (SUPPORTED_AUDIO.includes(ext)) return 'audio';
  if (SUPPORTED_VIDEO.includes(ext)) return 'video';
  if (SUPPORTED_PRESENTATIONS.includes(ext)) return 'presentation';
  return 'other';
}
