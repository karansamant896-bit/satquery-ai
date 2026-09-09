'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

const revealSelector = '.section, .cap-card, .mission-panel, .about-pillar-card, .about-interactive-card, .pipeline-panel';

export default function HomeClient() {
  const lastScroll = useRef(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = document.querySelectorAll<HTMLElement>(revealSelector);
    let direction: 'up' | 'down' = 'down';
    const onScroll = () => {
      const y = window.scrollY;
      direction = y >= lastScroll.current ? 'down' : 'up';
      lastScroll.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    if (reduceMotion) items.forEach((el) => el.classList.add('is-visible'));
    else {
      const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          el.classList.remove('is-leaving');
          el.classList.add('is-visible');
        } else if (el.classList.contains('is-visible')) {
          el.classList.remove('is-visible');
          el.classList.add('is-leaving');
          el.style.setProperty('--reveal-y', direction === 'down' ? '30px' : '-30px');
        }
      }), { threshold: 0.14, rootMargin: '-6% 0px -10% 0px' });
      items.forEach((el, index) => {
        el.style.transitionDelay = `${Math.min(index * 22, 180)}ms`;
        observer.observe(el);
      });
      return () => { observer.disconnect(); window.removeEventListener('scroll', onScroll); };
    }
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav-links a[href^="#"]'));
    const sections = Array.from(document.querySelectorAll<HTMLElement>('main > section[id]'));
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
    }), { threshold: 0.35, rootMargin: '-15% 0px -55% 0px' });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="noise" />
      <div className="cursor-glow" />
      <div className="web-bg-video" aria-hidden="true">
        <video autoPlay muted loop playsInline preload="auto" poster="/assets/video/earth-bg-hd-poster.jpg">
          <source src="/assets/video/earth-bg-hd.mp4" type="video/mp4" />
          <source src="/assets/video/bg2.mp4" type="video/mp4" />
          <source src="/assets/video/earth-bg-v3.mp4" type="video/mp4" />
        </video>
        <div className="video-vignette" /><div className="video-shade" /><div className="video-grid" />
        <div className="video-coordinates">28.61° N / 77.21° E</div>
        <div className="video-status"><span /> EARTH OBSERVATION / DEMO</div>
      </div>

      <header className="nav">
        <Link className="brand" href="/" aria-label="SATQuery AI home"><span className="brand-mark"><span /></span><span>SAT<span>QUERY</span><b>AI</b></span></Link>
        <nav className="nav-links">
          <a className="active" href="#home">Home</a><a href="#about">About</a><a href="#capabilities">Capabilities</a><a href="#mission">Mission</a>
        </nav>
        <Link className="launch-small" href="/workspace">Launch Sat-AI <span>↗</span></Link>
      </header>

      <main id="home">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><i /> <span>MULTIMODAL EARTH INTELLIGENCE</span></div>
            <h1>SEE EARTH<br /><em>DIFFERENTLY.</em></h1>
            <p className="hero-text">Ask questions. Explore satellite imagery. Turn complex remote-sensing data into clear, evidence-backed intelligence.</p>
            <div className="hero-actions"><Link className="button button-primary" href="/workspace">Launch Sat-AI <span>→</span></Link><a className="button button-ghost" href="#about">Discover SATQuery <span>↓</span></a></div>
            <div className="hero-meta"><span><b>01</b> ASK</span><span><b>02</b> ANALYZE</span><span><b>03</b> UNDERSTAND</span></div>
          </div>
          <div className="scroll-cue"><span /> SCROLL TO EXPLORE</div><div className="hero-index">SAT / 001</div>
        </section>

        <section className="about-section section" id="about">
          <div className="section-number">01 / ABOUT SATQUERY AI</div>
          <div className="about-hero-grid">
            <div className="about-intro-col"><p className="kicker">REVOLUTIONIZING EARTH OBSERVATION</p><h2>From satellite pixels<br /><em>to human dialogue.</em></h2><p className="about-lead">SATQuery AI bridges the gap between complex remote-sensing data and human intent. Users can ask natural-language questions about supported Earth-observation imagery without needing to master a GIS workflow first.</p>
              <div className="about-stats-row"><div className="stat-box"><span className="stat-number">3</span><span className="stat-label">Analysis modes</span></div><div className="stat-box"><span className="stat-number">4</span><span className="stat-label">Supported image types</span></div><div className="stat-box"><span className="stat-number">DEMO</span><span className="stat-label">ML inference status</span></div></div>
            </div>
            <div className="about-interactive-card"><div className="hud-header"><div className="hud-title"><span className="hud-dot" /> DEMO SATELLITE REASONING HUD</div><div className="hud-coords">BACKEND-AWARE UI</div></div><div className="hud-terminal"><div className="terminal-line prompt"><span className="terminal-tag user-tag">ANALYST QUERY</span><p>“What changed in this region between the two observations?”</p></div><div className="terminal-scanner"><div className="scanner-bar" /><div className="scanner-label"><span>INPUT PIPELINE:</span> QUERY · IMAGE A · OPTIONAL IMAGE B</div></div><div className="terminal-line response"><span className="terminal-tag ai-tag">DEMO RESULT</span><div className="response-content"><p><strong>Mock analysis ready.</strong> The interface is prepared for real multimodal inference once the ML milestone is integrated.</p><div className="confidence-meters"><div className="meter-item"><span>DEMO CONFIDENCE</span><div className="meter-track"><div className="meter-fill" style={{ width: '78%' }} /></div><span className="meter-val">DEMO</span></div></div></div></div></div><div className="hud-footer"><span>STATUS: MOCK / DEMO</span><span>MODEL: NOT YET INTEGRATED</span><span className="hud-status-badge">READY</span></div></div>
          </div>
          <div className="about-pillars-grid"><article className="about-pillar-card"><div className="pillar-icon">⎈</div><span className="pillar-no">CORE 01</span><h3>Natural-Language Queries</h3><p>Ask an Earth-observation question in plain language and select the analysis mode that matches the task.</p></article><article className="about-pillar-card active-pillar"><div className="pillar-icon">✦</div><span className="pillar-no">CORE 02</span><h3>Multimodal Analysis</h3><p>Prepare complementary imagery for a future vision-language and remote-sensing model pipeline.</p></article><article className="about-pillar-card"><div className="pillar-icon">⌖</div><span className="pillar-no">CORE 03</span><h3>Traceable Results</h3><p>Results are designed around confidence, evidence and execution steps so the final system can expose how an answer was produced.</p></article></div>
          <div className="pipeline-panel"><div className="pipeline-header"><p className="kicker">END-TO-END PIPELINE</p><h3>How SATQuery AI Operates</h3></div><div className="pipeline-steps"><div className="pipeline-step"><span className="step-num">01</span><h4>Request</h4><p>Query and imagery are collected from the workspace.</p></div><div className="pipeline-connector" /><div className="pipeline-step"><span className="step-num">02</span><h4>Validate</h4><p>Mode-specific inputs and file constraints are checked.</p></div><div className="pipeline-connector" /><div className="pipeline-step"><span className="step-num">03</span><h4>Analyze</h4><p>Backend routing prepares the task for the selected ML specialist.</p></div><div className="pipeline-connector" /><div className="pipeline-step"><span className="step-num">04</span><h4>Explain</h4><p>Answer, confidence, evidence and execution information are returned.</p></div></div></div>
        </section>

        <section className="capabilities section" id="capabilities"><div className="section-number">02 / CORE CAPABILITIES</div><div className="cap-header"><div><p className="kicker">ONE INTERFACE. MULTIPLE PERSPECTIVES.</p><h2>Ask. <em>Analyze.</em> Discover.</h2></div><p>Built around the current backend contract and ready for the next ML milestone.</p></div><div className="cap-grid"><article className="cap-card large"><span className="card-no">01</span><div className="card-icon">⌁</div><h3>Natural<br />Language Queries</h3><p>Ask your imagery what you want to know — in plain language.</p><div className="query-chip">“What changed in this region?”</div></article><article className="cap-card"><span className="card-no">02</span><div className="card-icon">◉</div><h3>Optical +<br />SAR</h3><p>Prepare two complementary observations for a future multimodal analysis path.</p><div className="sensor-row"><span>OPTICAL</span><span>SAR</span><span>AI</span></div></article><article className="cap-card"><span className="card-no">03</span><div className="card-icon">↗</div><h3>Bi-temporal<br />Change</h3><p>Compare two observations captured at different times.</p><div className="mini-timeline"><span>T1</span><i /><span>T2</span></div></article></div></section>

        <section className="mission section" id="mission"><div className="section-number">03 / THE MISSION</div><div className="mission-panel"><div className="mission-copy"><p className="kicker">EARTH OBSERVATION × AI</p><h2>Make the invisible<br /><em>understandable.</em></h2><p>SATQuery AI aims to bridge the gap between powerful satellite datasets and the people who need to interpret them.</p><Link className="text-link" href="/workspace">Enter the intelligence layer <span>→</span></Link></div><div className="signal"><div className="satellite-stage" aria-label="Rotating Earth observation satellite" role="img"><div className="sat-orbit sat-orbit-one" /><div className="sat-orbit sat-orbit-two" /><div className="satellite-image-wrap"><img className="satellite-image" src="/assets/satellite.png" alt="Earth observation satellite" /><span className="sat-signal-dot" /></div><span className="sat-label">SAT-AI / ORBITAL NODE</span></div><div className="signal-line" /><span>QUERY / IMAGE / INSIGHT</span></div></div></section>

        <section className="launch section" id="launch"><div className="launch-orbit" /><p className="kicker">READY WHEN YOU ARE</p><h2>ASK <em>EARTH.</em></h2><p>Upload imagery. Write a query. Run the demo pipeline — and plug in real inference when the ML service is ready.</p><Link className="button button-primary big" href="/workspace">Launch Sat-AI <span>↗</span></Link></section>
      </main>
      <footer className="footer"><div className="brand footer-brand"><span className="brand-mark"><span /></span><span>SAT<span>QUERY</span><b>AI</b></span></div><p>Vision-language intelligence for remote-sensing imagery.</p><span>SIH26167 · 2026 · DEMO FRONTEND</span></footer>
    </>
  );
}
