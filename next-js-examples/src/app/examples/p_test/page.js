'use client'
import React, { useRef, useState, useEffect, useCallback } from "react";
import SpeechGenerator from '@/components/SpeechGenerator';
import { log } from '@/components/log';

// AnimalImage structure:
// {
//   id: string,        // normalized id (e.g., "ele_back", "ele_tail_fur")
//   path: string,      // image serving path
//   name: string,      // display name (e.g., "Back", "Tail Fur")
//   filename: string   // original filename
// }

// Workflow stages
const STAGES = {
  SELECT_IMAGE: 0,
  RECOGNITION: 1,
  BLEND_SELECT: 2,
  FINAL_RESULT: 3,
  GENERATE_IMAGE: 4
};

// Monochrome color palette
const C = {
  bg: '#0a0a0a',
  bgCard: '#141414',
  border: '#222',
  borderHover: '#333',
  text: '#999',
  textBright: '#fff',
  textMuted: '#666',
};

// Chinese to English animal name translation - comprehensive dictionary from all JSON files
const translateAnimalName = (chineseName) => {
  const translations = {
    // Elephants
    '亚洲象': 'Asian Elephant',
    '非洲象': 'African Elephant',
    '野象': 'Wild Elephant',
    '猛犸象': 'Mammoth',
    
    // Primates
    '黑猩猩': 'Chimpanzee',
    '大猩猩': 'Gorilla',
    '婆罗洲猩猩': 'Bornean Orangutan',
    
    // Large mammals
    '河马': 'Hippopotamus',
    '水牛': 'Water Buffalo',
    '鹿豚': 'Babirusa',
    '豪猪': 'Porcupine',
    
    // Rhinoceros
    '印度犀': 'Indian Rhinoceros',
    '白犀': 'White Rhinoceros',
    '中国犀牛': 'Chinese Rhinoceros',
    '独角犀牛': 'One-horned Rhinoceros',
    
    // Marine mammals
    '海象': 'Walrus',
    '象海豹': 'Elephant Seal',
    '海牛': 'Manatee',
    '蓝鲸': 'Blue Whale',
    
    // Marine creatures
    '蝠鲼': 'Manta Ray',
    '魟': 'Stingray',
    '刺鳐': 'Spotted Stingray',
    '电鳐': 'Electric Ray',
    '魟鱼': 'Ray Fish',
    '海洋鱼类': 'Marine Fish',
    '海底珊瑚': 'Sea Coral',
    
    // Reptiles
    '加拉帕戈斯象龟': 'Galapagos Tortoise',
    '爬虫类': 'Reptile',
    '鬣鳞蜥': 'Iguana',
    
    // Birds
    '红嘴牛椋鸟': 'Red-billed Oxpecker',
    '黑美洲鹫': 'Black Vulture',
    '珍珠鸡': 'Guinea Fowl',
    '美洲鸵': 'Greater Rhea',
    '鸨': 'Bustard',
    '鸸鹋': 'Emu',
    '美洲蛇鹈': 'Anhinga',
    '鸵鸟': 'Ostrich',
    '秧鹤': 'Limpkin',
    '鹬鸵': 'Kiwi',
    '鹤鸵': 'Cassowary',
    '走鹃': 'Roadrunner',
    
    // Other common animals (for completeness)
    '长颈鹿': 'Giraffe',
    '斑马': 'Zebra',
    '狮子': 'Lion',
    '老虎': 'Tiger',
    '豹': 'Leopard',
    '熊猫': 'Panda',
    '熊': 'Bear',
    '狼': 'Wolf',
    '狐狸': 'Fox',
    '鹿': 'Deer',
    '马': 'Horse',
    '牛': 'Cow',
    '羊': 'Sheep',
    '猪': 'Pig',
    '狗': 'Dog',
    '猫': 'Cat',
    '兔子': 'Rabbit',
    '老鼠': 'Rat',
    '猴子': 'Monkey',
    '猩猩': 'Orangutan',
    '犀牛': 'Rhinoceros',
    '鳄鱼': 'Crocodile',
    '蛇': 'Snake',
    '鸟': 'Bird',
    '鹰': 'Eagle',
    '企鹅': 'Penguin',
    '海豹': 'Seal',
    '海豚': 'Dolphin',
    '鲸鱼': 'Whale',
    '鲨鱼': 'Shark',
    '乌龟': 'Turtle',
    '蜥蜴': 'Lizard',
    '青蛙': 'Frog',
    '蜘蛛': 'Spider',
    '蚂蚁': 'Ant',
    '蜜蜂': 'Bee',
    '蝴蝶': 'Butterfly',
    
    // Special cases
    '非动物': 'Not an Animal',
  };
  
  return translations[chineseName] || chineseName; // Return English if found, otherwise return original
};

export default function Home() {
  const speechRef = useRef(null);
  
  const [stage, setStage] = useState(STAGES.SELECT_IMAGE);
  const [images, setImages] = useState([]);
  const [selectedId, setSelectedId] = useState(null); // NFC/Arduino: 统一用 id 管理选中状态
  const [loadingImages, setLoadingImages] = useState(true);
  const [recognitionResults, setRecognitionResults] = useState([]);
  const [loadingRecognition, setLoadingRecognition] = useState(false);
  const [selectedAnimals, setSelectedAnimals] = useState([null, null]);
  const [blendRatio, setBlendRatio] = useState(0.5);
  const [finalPrompt, setFinalPrompt] = useState('');
  const [mixLine, setMixLine] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);

  // 从 selectedId 计算当前选中的图片对象
  const selectedImage = selectedId ? images.find(img => img.id === selectedId) : null;

  useEffect(() => {
    fetchImages();
  }, []);

  // NFC/Arduino: WebSocket 连接，监听卡片刷卡事件
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ws = new WebSocket('ws://localhost:3001');

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'card' && typeof msg.id === 'string') {
          // Arduino 传来的 id 直接设置选中状态
          console.log('[NFC] Card detected:', msg.id);
          setSelectedId(msg.id);
        }
      } catch (e) {
        console.error('[WS parse error]', e);
      }
    };

    ws.onopen = () => {
      console.log('[WS] Connected to Arduino bridge');
    };

    ws.onclose = () => {
      console.log('[WS] Connection closed');
    };

    ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };

    return () => {
      ws.close();
    };
  }, []);

  const fetchImages = async () => {
    try {
      setLoadingImages(true);
      const res = await fetch('/api/animals/list');
      const data = await res.json();
      if (data.images) setImages(data.images);
    } catch (e) {
      console.error('Failed to load images:', e);
    } finally {
      setLoadingImages(false);
    }
  };

  // 处理图片识别（基于当前 selectedId）
  const handleImageRecognition = useCallback(async () => {
    if (!selectedId || images.length === 0) return;
    
    const image = images.find(img => img.id === selectedId);
    if (!image) {
      console.error('[handleImageRecognition] Image not found for id:', selectedId);
      return;
    }

    setLoadingRecognition(true);
    setStage(STAGES.RECOGNITION);
    
    try {
      const res = await fetch('/api/animals/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: image.filename })
      });
      const data = await res.json();
      if (data.success && data.result) {
        // Translate Chinese names to English
        const translatedResults = data.result.map(item => ({
          ...item,
          name: translateAnimalName(item.name),
          originalName: item.name // Keep original for reference
        }));
        setRecognitionResults(translatedResults);
      } else {
        alert('Recognition failed. Please try again.');
        setStage(STAGES.SELECT_IMAGE);
        setSelectedId(null);
      }
    } catch (e) {
      console.error('Recognition error:', e);
      alert('Recognition error. Check console.');
      setStage(STAGES.SELECT_IMAGE);
      setSelectedId(null);
    } finally {
      setLoadingRecognition(false);
    }
  }, [selectedId, images]);

  // NFC/Arduino: 当 selectedId 变化时，自动触发识别流程
  useEffect(() => {
    if (selectedId && images.length > 0 && !loadingImages) {
      handleImageRecognition();
    }
  }, [selectedId, images.length, loadingImages, handleImageRecognition]); // 当 selectedId 或 images 加载完成时触发

  const handleProceedToBlend = () => {
    if (recognitionResults.length >= 2) {
      setSelectedAnimals([recognitionResults[0], recognitionResults[1]]);
      setStage(STAGES.BLEND_SELECT);
    }
  };

  const handleAnimalSelect = (animal, slot) => {
    const newSelection = [...selectedAnimals];
    newSelection[slot] = animal;
    setSelectedAnimals(newSelection);
  };

  const handleConfirmBlend = () => {
    if (selectedAnimals[0] && selectedAnimals[1]) {
      setStage(STAGES.FINAL_RESULT);
    }
  };

  const r1 = (x) => Math.round(x * 10) / 10;
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const buildImagePrompt = (a, b) => {
    const A = a.name.toLowerCase();
    const B = b.name.toLowerCase();
    const aR = r1(a.ratio);
    const bR = r1(b.ratio);
    const dominant = aR >= bR ? A : B;
    const secondary = aR < bR ? A : B;
    const ratioD = aR >= bR ? aR : bR;

    const map = {
      0.9: `almost entirely ${dominant}-like with subtle ${secondary} nuances`,
      0.8: `predominantly ${dominant}-like with softened ${secondary} traces`,
      0.7: `largely ${dominant}-based yet clearly infused with ${secondary} traits`,
      0.6: `balanced toward ${dominant} while ${secondary} details remain evident`,
      0.5: `a true morphological blend showing equal influence of ${dominant} and ${secondary}`,
      0.4: `leaning toward ${secondary} yet keeping strong ${dominant} skeletal proportions`,
      0.3: `mainly ${secondary}-like with residual ${dominant} anatomical cues`,
      0.2: `predominantly ${secondary}-based, with only faint ${dominant} memory`,
      0.1: `almost entirely ${secondary}-like with only minimal ${dominant} suggestion`
    };
    const k = Object.keys(map).map(Number).reduce((a,b)=>Math.abs(b-ratioD)<Math.abs(a-ratioD)?b:a);
    const overallLine = map[k];

    const regions = {
      Cranial: ["cranium shape", "orbital region", "nasal ridge", "snout length", "jawline curvature", "teeth arrangement", "ear form", "forehead slope", "temporal area"],
      Facial: ["eyes", "eyelids", "nostrils", "mouth opening", "lips", "chin contour"],
      NeckShoulder: ["neck length", "throat folds", "shoulder girdle", "collar transition"],
      Forelimbs: ["upper arm", "elbow joint", "forearm", "wrist", "palm", "digits or claws", "nails or pads"],
      Hindlimbs: ["thigh", "knee joint", "shank", "ankle", "foot arch", "toes", "heel pad"],
      Tail: ["tail base", "tail length", "cross-section", "terminal shape"],
      Surface: ["skin folds", "texture", "scales or fur", "color pattern", "dermal ridges", "pores"]
    };

    const featureVocab = ["skeletal contour", "musculature", "surface proportion", "joint articulation", "textural character", "dermal structure", "scale pattern", "external morphology", "soft-tissue envelope"];

    const regionText = Object.entries(regions).map(([name, parts]) => {
      const lines = parts.map(p => {
        const f1 = rand(featureVocab);
        const f2 = rand(featureVocab);
        if (ratioD >= 0.7) return `the ${p} follows ${dominant}'s ${f1} but incorporates ${secondary}'s ${f2} in a subtle gradient`;
        if (ratioD <= 0.3) return `the ${p} retains ${secondary}'s ${f1} yet still carries faint ${dominant}-style ${f2}`;
        return `the ${p} merges ${dominant} and ${secondary} anatomical cues into a coherent blended form`;
      });
      return `— **${name.toUpperCase()} REGION:**\n• ${lines.join("\n• ")}`;
    }).join("\n\n");

    const constraints = `avoid any full transplantation of heads, limbs, or tails.
every element must appear structurally continuous and biologically plausible.
emphasize gradual anatomical fusion, not collage.
render with fine cross-hatching and engraving texture in the manner of a 19th-century zoological etching,
centered on white background, scientific yet elegant tone.`;

    const prompt = `a highly detailed black and white ink illustration of an evolutionary intermediate species between a ${A} and a ${B}.
the overall anatomy is ${overallLine}.

${regionText}

— **GENERAL CONSTRAINTS:**
${constraints}`;

    const mix = `Mix: ${aR.toFixed(1)} ${A} + ${bR.toFixed(1)} ${B}`;
    return { prompt, mix };
  };

  const generatePrompt = async () => {
    if (!selectedAnimals[0] || !selectedAnimals[1]) {
      alert('Please select two animals first.');
      return;
    }
    try {
      setLoadingPrompt(true);
      setImgUrl('');
      const m1 = { name: selectedAnimals[0].name, ratio: blendRatio };
      const m2 = { name: selectedAnimals[1].name, ratio: 1 - blendRatio };
      const { prompt, mix } = buildImagePrompt(m1, m2);
      setFinalPrompt(prompt);
      setMixLine(mix);
      log.addMessage({ role: "assistant", content: [{ type: "text", text: `${prompt}\n\n${mix}` }] });
      setStage(STAGES.GENERATE_IMAGE);
    } catch (e) {
      console.error('generatePrompt error:', e);
      setFinalPrompt('Failed to build prompt.');
      setMixLine('');
    } finally {
      setLoadingPrompt(false);
    }
  };

  const generateImage = async () => {
    if (!finalPrompt) return alert('Generate prompt first.');
    try {
      setLoadingImage(true);
      setImgUrl('');
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        const text = await res.text();
        console.error('Failed to parse response:', text);
        alert(`Image generation failed: Invalid response from server. Status: ${res.status}`);
        return;
      }
      
      if (!res.ok) {
        // Build detailed error message
        let errorMsg = data?.error || `HTTP ${res.status}`;
        
        // Extract error details
        if (data?.detail) {
          let detail = data.detail;
          if (typeof detail === 'object') {
            // Try to extract meaningful error message from OpenAI error object
            if (detail.error?.message) {
              detail = detail.error.message;
            } else if (detail.error?.code) {
              detail = `${detail.error.code}: ${detail.error.message || detail.error.type || 'Unknown error'}`;
            } else {
              detail = JSON.stringify(detail);
            }
          }
          errorMsg += `\n\nDetails: ${detail}`;
        }
        
        if (data?.upstream_status) {
          errorMsg += `\n\nStatus Code: ${data.upstream_status}`;
        }
        
        console.error('Image API error:', { status: res.status, data });
        alert(`Image generation failed: ${errorMsg}`);
        return;
      }
      
      if (!data?.image_b64) {
        console.error('No image_b64 in response:', data);
        alert('Image generation failed: No image data received.');
        return;
      }
      
      setImgUrl(`data:image/png;base64,${data.image_b64}`);
    } catch (e) {
      console.error('generateImage error:', e);
      alert(`Image generation failed: ${e.message || 'Network error'}`);
    } finally {
      setLoadingImage(false);
    }
  };

  const handleReset = () => {
    setStage(STAGES.SELECT_IMAGE);
    setSelectedId(null); // NFC/Arduino: 重置时清空选中 id
    setRecognitionResults([]);
    setSelectedAnimals([null, null]);
    setBlendRatio(0.5);
    setFinalPrompt('');
    setMixLine('');
    setImgUrl('');
  };

  // Styles
  const styles = {
    main: {
      minHeight: '100vh',
      background: C.bg,
      color: C.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      padding: '40px 24px',
      boxSizing: 'border-box',
    },
    header: {
      textAlign: 'center',
      marginBottom: 48,
    },
    title: {
      fontSize: 48,
      fontWeight: 200,
      letterSpacing: 16,
      color: C.textBright,
      margin: '0 0 8px 0',
    },
    subtitle: {
      fontSize: 12,
      letterSpacing: 4,
      color: C.textMuted,
      textTransform: 'uppercase',
    },
    stageNav: {
      display: 'flex',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 48,
    },
    stageStep: (active, current) => ({
      width: 40,
      height: 3,
      background: current ? C.textBright : active ? C.text : C.border,
      transition: 'all 0.3s ease',
    }),
    stageArea: {
      maxWidth: 1100,
      margin: '0 auto',
    },
    sectionTitle: {
      fontSize: 24,
      fontWeight: 300,
      color: C.textBright,
      textAlign: 'center',
      margin: '0 0 40px 0',
    },
    photoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: 12,
    },
    photoCard: {
      position: 'relative',
      aspectRatio: '1',
      overflow: 'hidden',
      cursor: 'pointer',
      border: `1px solid ${C.border}`,
      transition: 'all 0.25s ease',
    },
    photoCardImg: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block',
    },
    photoOverlay: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)',
      pointerEvents: 'none',
    },
    photoLabel: {
      position: 'absolute',
      bottom: 10,
      left: 10,
      right: 10,
      fontSize: 12,
      fontWeight: 400,
      color: '#fff',
      zIndex: 1,
    },
    loaderWrap: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '80px 0',
      gap: 20,
    },
    loaderRing: {
      width: 40,
      height: 40,
      border: `2px solid ${C.border}`,
      borderTopColor: C.textBright,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    },
    loaderText: {
      color: C.textMuted,
      fontSize: 13,
    },
    recogLayout: {
      display: 'grid',
      gridTemplateColumns: '260px 1fr',
      gap: 32,
      alignItems: 'start',
    },
    recogPreview: {
      overflow: 'hidden',
      border: `1px solid ${C.textBright}`,
    },
    recogPreviewImg: {
      width: '100%',
      display: 'block',
    },
    recogList: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    },
    recogItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '10px 14px',
      background: C.bgCard,
      border: `1px solid ${C.border}`,
    },
    recogRank: {
      width: 24,
      height: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: C.textBright,
      color: C.bg,
      fontSize: 11,
      fontWeight: 600,
      flexShrink: 0,
    },
    recogName: {
      flex: 1,
      fontSize: 14,
      color: C.textBright,
    },
    recogBarWrap: {
      width: 100,
      height: 4,
      background: C.border,
      overflow: 'hidden',
    },
    recogBar: (pct) => ({
      width: `${pct}%`,
      height: '100%',
      background: C.textBright,
      transition: 'width 0.4s ease',
    }),
    recogScore: {
      width: 50,
      textAlign: 'right',
      fontSize: 12,
      color: C.text,
    },
    btnRow: {
      display: 'flex',
      justifyContent: 'center',
      gap: 12,
      marginTop: 32,
      flexWrap: 'wrap',
    },
    btn: {
      padding: '12px 32px',
      fontSize: 13,
      fontWeight: 500,
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: 'inherit',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      letterSpacing: 1,
    },
    btnPrimary: {
      background: C.textBright,
      color: C.bg,
    },
    btnSecondary: {
      background: 'transparent',
      color: C.textBright,
      border: `1px solid ${C.textBright}`,
    },
    blendGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 24,
      marginBottom: 24,
    },
    blendPanel: {
      background: C.bgCard,
      padding: 20,
      border: `1px solid ${C.border}`,
    },
    blendPanelTitle: {
      fontSize: 12,
      color: C.textMuted,
      margin: '0 0 16px 0',
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    animalList: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      maxHeight: 260,
      overflowY: 'auto',
    },
    animalRow: (picked) => ({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 12px',
      background: picked ? C.borderHover : 'transparent',
      cursor: 'pointer',
      border: `1px solid ${picked ? C.textBright : 'transparent'}`,
      transition: 'all 0.15s ease',
    }),
    animalRowName: {
      fontSize: 13,
      color: C.textBright,
    },
    animalRowScore: {
      fontSize: 11,
      color: C.textMuted,
    },
    pickedIndicator: {
      marginTop: 12,
      padding: 10,
      border: `1px solid ${C.textBright}`,
      textAlign: 'center',
      color: C.textBright,
      fontSize: 12,
    },
    ratioBox: {
      background: C.bgCard,
      padding: 24,
      border: `1px solid ${C.border}`,
      marginBottom: 24,
    },
    ratioHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 12,
      fontSize: 12,
      color: C.textMuted,
    },
    ratioInput: {
      width: '100%',
      height: 6,
      WebkitAppearance: 'none',
      appearance: 'none',
      background: `linear-gradient(90deg, ${C.textBright} 0%, ${C.border} 100%)`,
      outline: 'none',
      cursor: 'pointer',
    },
    ratioValues: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    ratioVal: {
      fontSize: 20,
      fontWeight: 300,
      color: C.textBright,
    },
    summaryCard: {
      background: C.bgCard,
      padding: 40,
      border: `1px solid ${C.border}`,
      textAlign: 'center',
      maxWidth: 480,
      margin: '0 auto 24px',
    },
    summaryBlend: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
    },
    summaryAnimal: {
      textAlign: 'center',
    },
    summaryPct: {
      fontSize: 42,
      fontWeight: 200,
      color: C.textBright,
    },
    summaryName: {
      fontSize: 14,
      color: C.text,
      marginTop: 4,
    },
    summaryPlus: {
      fontSize: 24,
      color: C.textMuted,
    },
    summarySource: {
      marginTop: 24,
      fontSize: 12,
      color: C.textMuted,
    },
    promptBox: {
      background: C.bgCard,
      padding: 24,
      border: `1px solid ${C.border}`,
      maxWidth: 680,
      margin: '0 auto 24px',
    },
    promptLabel: {
      fontSize: 11,
      color: C.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 12,
    },
    promptContent: {
      fontSize: 12,
      color: C.text,
      lineHeight: 1.7,
      whiteSpace: 'pre-wrap',
      maxHeight: 180,
      overflowY: 'auto',
    },
    promptMix: {
      marginTop: 16,
      paddingTop: 16,
      borderTop: `1px solid ${C.border}`,
      color: C.textBright,
      fontSize: 13,
    },
    genImageWrap: {
      maxWidth: 480,
      margin: '32px auto',
      border: `1px solid ${C.textBright}`,
    },
    genImageImg: {
      width: '100%',
      display: 'block',
    },
    resetFloat: {
      position: 'fixed',
      bottom: 24,
      right: 24,
      padding: '10px 20px',
      background: 'transparent',
      border: `1px solid ${C.border}`,
      color: C.textMuted,
      fontSize: 12,
      cursor: 'pointer',
      fontFamily: 'inherit',
      transition: 'all 0.2s ease',
    },
  };

  // Keyframes for spinner
  useEffect(() => {
    const styleId = 'animorph-keyframes';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          background: ${C.textBright};
          cursor: pointer;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <main style={styles.main}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>ANIMORPH</h1>
        <p style={styles.subtitle}>AI & Human Perception Project</p>
      </header>
      
      {/* Stage Progress */}
      <nav style={styles.stageNav}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={styles.stageStep(stage >= i, stage === i)} />
        ))}
      </nav>
      
      {/* Stage Content */}
      <div style={styles.stageArea}>
        
        {/* STAGE 0: Select Image */}
        {stage === STAGES.SELECT_IMAGE && (
          <>
            <h2 style={styles.sectionTitle}>Select an Image</h2>
            {loadingImages ? (
              <div style={styles.loaderWrap}>
                <div style={styles.loaderRing} />
                <span style={styles.loaderText}>Loading...</span>
              </div>
            ) : (
              <div style={styles.photoGrid}>
                {images.map((img, i) => {
                  const isSelected = selectedId === img.id; // NFC/Arduino: 基于 id 判断是否选中
                  return (
                    <div 
                      key={img.id} // 使用 id 作为 key
                      style={{
                        ...styles.photoCard,
                        borderColor: isSelected ? C.textBright : C.border, // 高亮选中的卡片
                        borderWidth: isSelected ? 2 : 1
                      }}
                      onClick={() => setSelectedId(img.id)} // 手动点击：设置 id
                      onMouseEnter={e => e.currentTarget.style.borderColor = C.textBright}
                      onMouseLeave={e => e.currentTarget.style.borderColor = isSelected ? C.textBright : C.border}
                    >
                      <img src={img.path} alt={img.name} style={styles.photoCardImg} />
                      <div style={styles.photoOverlay} />
                      <span style={styles.photoLabel}>{img.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        
        {/* STAGE 1: Recognition Results */}
        {stage === STAGES.RECOGNITION && (
          <>
            <h2 style={styles.sectionTitle}>AI Recognition</h2>
            {loadingRecognition ? (
              <div style={styles.loaderWrap}>
                <div style={styles.loaderRing} />
                <span style={styles.loaderText}>Analyzing...</span>
              </div>
            ) : (
              <>
                <div style={styles.recogLayout}>
                  {selectedImage && (
                    <div style={styles.recogPreview}>
                      <img src={selectedImage.path} alt="Selected" style={styles.recogPreviewImg} />
                    </div>
                  )}
                  <div style={styles.recogList}>
                    {recognitionResults.map((r, i) => {
                      const pct = parseFloat(r.score) * 100;
                      return (
                        <div key={i} style={styles.recogItem}>
                          <span style={styles.recogRank}>{i + 1}</span>
                          <span style={styles.recogName}>{r.name}</span>
                          <div style={styles.recogBarWrap}>
                            <div style={styles.recogBar(pct)} />
                          </div>
                          <span style={styles.recogScore}>{pct.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={styles.btnRow}>
                  <button style={{...styles.btn, ...styles.btnPrimary}} onClick={handleProceedToBlend}>
                    Continue →
                  </button>
                </div>
              </>
            )}
          </>
        )}
        
        {/* STAGE 2: Blend Selection */}
        {stage === STAGES.BLEND_SELECT && (
          <>
            <h2 style={styles.sectionTitle}>Create Your Blend</h2>
            <div style={styles.blendGrid}>
              {[0, 1].map(slot => (
                <div key={slot} style={styles.blendPanel}>
                  <h3 style={styles.blendPanelTitle}>Animal {slot + 1}</h3>
                  <div style={styles.animalList}>
                    {recognitionResults.map((animal, i) => {
                      const picked = selectedAnimals[slot]?.name === animal.name;
                      return (
                        <div
                          key={i}
                          style={styles.animalRow(picked)}
                          onClick={() => handleAnimalSelect(animal, slot)}
                        >
                          <span style={styles.animalRowName}>{animal.name}</span>
                          <span style={styles.animalRowScore}>{(parseFloat(animal.score) * 100).toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                  {selectedAnimals[slot] && (
                    <div style={styles.pickedIndicator}>
                      ✓ {selectedAnimals[slot].name}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div style={styles.ratioBox}>
              <div style={styles.ratioHeader}>
                <span>{selectedAnimals[0]?.name || 'Animal 1'}</span>
                <span>{selectedAnimals[1]?.name || 'Animal 2'}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={blendRatio}
                onChange={(e) => setBlendRatio(parseFloat(e.target.value))}
                style={styles.ratioInput}
              />
              <div style={styles.ratioValues}>
                <span style={styles.ratioVal}>{(blendRatio * 100).toFixed(0)}%</span>
                <span style={styles.ratioVal}>{((1 - blendRatio) * 100).toFixed(0)}%</span>
              </div>
            </div>
            
            <div style={styles.btnRow}>
              <button 
                style={{...styles.btn, ...styles.btnPrimary, opacity: (!selectedAnimals[0] || !selectedAnimals[1]) ? 0.5 : 1}}
                disabled={!selectedAnimals[0] || !selectedAnimals[1]}
                onClick={handleConfirmBlend}
              >
                Confirm →
              </button>
            </div>
          </>
        )}
        
        {/* STAGE 3: Final Result */}
        {stage === STAGES.FINAL_RESULT && (
          <>
            <h2 style={styles.sectionTitle}>Your Selection</h2>
            <div style={styles.summaryCard}>
              <div style={styles.summaryBlend}>
                <div style={styles.summaryAnimal}>
                  <div style={styles.summaryPct}>{(blendRatio * 100).toFixed(0)}%</div>
                  <div style={styles.summaryName}>{selectedAnimals[0]?.name}</div>
                </div>
                <div style={styles.summaryPlus}>+</div>
                <div style={styles.summaryAnimal}>
                  <div style={styles.summaryPct}>{((1 - blendRatio) * 100).toFixed(0)}%</div>
                  <div style={styles.summaryName}>{selectedAnimals[1]?.name}</div>
                </div>
              </div>
              <div style={styles.summarySource}>
                Source: {selectedImage?.name}
              </div>
            </div>
            <div style={styles.btnRow}>
              <button style={{...styles.btn, ...styles.btnSecondary}} onClick={() => setStage(STAGES.BLEND_SELECT)}>
                ← Adjust
              </button>
              <button 
                style={{...styles.btn, ...styles.btnPrimary, opacity: loadingPrompt ? 0.5 : 1}}
                onClick={generatePrompt}
                disabled={loadingPrompt}
              >
                {loadingPrompt ? 'Generating...' : 'Generate Hybrid →'}
        </button>
            </div>
          </>
        )}
        
        {/* STAGE 4: Generate Image */}
        {stage === STAGES.GENERATE_IMAGE && (
          <>
            <h2 style={styles.sectionTitle}>Hybrid Generation</h2>
            <div style={styles.promptBox}>
              <div style={styles.promptLabel}>Generated Prompt</div>
              <div style={styles.promptContent}>{finalPrompt || '(No prompt)'}</div>
              {mixLine && <div style={styles.promptMix}>{mixLine}</div>}
            </div>
            <div style={styles.btnRow}>
              <button 
                style={{...styles.btn, ...styles.btnPrimary, opacity: (!finalPrompt || loadingImage) ? 0.5 : 1}}
                onClick={generateImage}
                disabled={!finalPrompt || loadingImage}
              >
                {loadingImage ? 'Generating...' : 'Generate Image'}
        </button>
        {imgUrl && (
                <a href={imgUrl} download="animorph_hybrid.png" style={{...styles.btn, ...styles.btnSecondary}}>
                  ↓ Download
                </a>
              )}
            </div>
            {imgUrl && (
              <div style={styles.genImageWrap}>
                <img src={imgUrl} alt="Generated hybrid" style={styles.genImageImg} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Reset Button */}
      {stage > STAGES.SELECT_IMAGE && (
        <button 
          style={styles.resetFloat} 
          onClick={handleReset}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.textBright; e.currentTarget.style.color = C.textBright; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
        >
          ↻ Start Over
        </button>
      )}
      
      <SpeechGenerator ref={speechRef} onEnded={() => console.log('voice end')} />
    </main>
  );
}
