import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error(`Cannot find built index.html at ${indexPath}. Run Vite build before generating SEO pages.`);
}

const baseHtml = fs.readFileSync(indexPath, 'utf8');
const site = 'https://aifacilitator.ai';

const pages = [
  {
    route: '/',
    title: 'AI Workshop Facilitation Software for Teams | AIfacilitator',
    description: 'Run better workshops with AI facilitators for design sprints, agile retrospectives, strategic planning and remote team alignment.',
    keywords: 'AI workshop facilitation software, AI facilitator, workshop facilitation, remote workshops, agile retrospective tool, design sprint facilitator',
    schemaType: 'SoftwareApplication',
  },
  {
    route: '/about',
    title: 'About AIfacilitator | AI Workshop Facilitation Platform',
    description: 'Learn how AIfacilitator helps product, agile, HR and innovation teams run structured workshops with expert AI facilitators.',
    keywords: 'about AIfacilitator, AI workshop facilitation platform, team facilitation software, AI collaboration software',
    schemaType: 'AboutPage',
  },
  {
    route: '/pricing',
    title: 'AIfacilitator Pricing | AI Workshop Facilitation Plans',
    description: 'Compare AIfacilitator plans for AI-guided workshops, retrospectives, design sprints and team facilitation. Start free or choose a team plan.',
    keywords: 'AIfacilitator pricing, AI facilitation pricing, workshop facilitation software plans, AI retrospective tool pricing',
    schemaType: 'Product',
  },
  {
    route: '/faqs',
    title: 'AIfacilitator FAQs | AI Workshop Facilitation Questions',
    description: 'Find answers about AIfacilitator, AI workshop facilitation, data privacy, pricing, use cases and how teams run AI-guided sessions.',
    keywords: 'AIfacilitator FAQs, AI facilitation questions, workshop software help, AI facilitator FAQ',
    schemaType: 'FAQPage',
  },
  {
    route: '/contact',
    title: 'Contact AIfacilitator | Book an AI Workshop Facilitation Demo',
    description: 'Contact AIfacilitator to ask a question, discuss team plans, or book a demo for AI workshop facilitation software.',
    keywords: 'contact AIfacilitator, book AI workshop demo, AI facilitation demo, workshop software contact sales',
    schemaType: 'ContactPage',
  },
  {
    route: '/use-cases/design-sprint',
    title: 'AI Design Sprint Facilitator for Product Teams | AIfacilitator',
    description: 'Use AIfacilitator to plan and run design sprints with AI-guided agendas, structured decisions and clear product outcomes.',
    keywords: 'AI design sprint facilitator, design sprint facilitation software, product team workshops, AI product discovery',
    schemaType: 'Article',
  },
  {
    route: '/use-cases/retrospective',
    title: 'AI Retrospective Tool for Remote Teams | AIfacilitator',
    description: 'Run agile retrospectives with an AI facilitator that guides discussion, captures actions and helps remote teams improve continuously.',
    keywords: 'AI retrospective tool, agile retrospective software, remote retrospective tool, scrum retrospective facilitator',
    schemaType: 'Article',
  },
  {
    route: '/use-cases/strategic-planning',
    title: 'AI Strategic Planning Workshop Facilitator | AIfacilitator',
    description: 'Facilitate strategic planning workshops with AI-guided structure, stakeholder alignment, prioritisation and action planning.',
    keywords: 'AI strategic planning facilitator, strategic planning workshop software, strategy workshop facilitation, AI planning workshop',
    schemaType: 'Article',
  },
  {
    route: '/compare/aifacilitator-vs-sessionlab',
    title: 'AIfacilitator vs SessionLab | AI Facilitation Comparison',
    description: 'Compare AIfacilitator and SessionLab for workshop planning, live AI facilitation, team alignment and post-session outcomes.',
    keywords: 'AIfacilitator vs SessionLab, SessionLab alternative, AI workshop facilitation comparison, workshop planning software',
    schemaType: 'WebPage',
  },
  {
    route: '/compare/aifacilitator-vs-miro',
    title: 'AIfacilitator vs Miro | AI Workshop Facilitation Alternative',
    description: 'Compare AIfacilitator and Miro for guided workshops, AI facilitation, decision-making and structured team sessions.',
    keywords: 'AIfacilitator vs Miro, Miro alternative, AI workshop tool, workshop facilitation software comparison',
    schemaType: 'WebPage',
    staticContent: {
      h1: 'AIfacilitator vs Miro: AI workshop facilitation alternative',
      intro: 'AIfacilitator and Miro solve different workshop problems. Miro is a flexible visual collaboration whiteboard; AIfacilitator is built to actively guide live workshops, retrospectives, design sprints, brainstorming sessions and strategic planning with AI facilitation.',
      sections: [
        {
          h2: 'When AIfacilitator is the better fit',
          body: 'Choose AIfacilitator when the team needs a structured AI facilitator that guides participants through a session, asks questions, keeps discussion moving, captures outputs, and helps turn workshop activity into decisions and follow-up actions.',
        },
        {
          h2: 'When Miro is the better fit',
          body: 'Choose Miro when the primary need is an open-ended visual canvas for mapping, sticky notes, diagrams and asynchronous collaboration. Miro can complement AIfacilitator as a visual workspace, but it is not primarily an autonomous workshop facilitator.',
        },
        {
          h2: 'Best use cases',
          body: 'AIfacilitator is designed for AI-guided retrospectives, design sprints, brainstorming, remote workshops, strategic planning and team alignment sessions. Teams can start free without a credit card and upgrade when they need larger sessions, more facilitators or more advanced workflow support.',
        },
      ],
      cta: 'Start free with AIfacilitator to run AI-guided workshops without a credit card.',
    },
  },
  {
    route: '/blog',
    title: 'AIfacilitator Blog | AI Workshop Facilitation Guides',
    description: 'Read practical guides on AI workshop facilitation, remote collaboration, agile retrospectives, design sprints and team alignment.',
    keywords: 'AI workshop facilitation blog, remote team guides, agile retrospective articles, design sprint guides',
    schemaType: 'Blog',
  },
  {
    route: '/blog/how-to-use-ai-for-workshop-facilitation',
    title: 'How to Use AI for Workshop Facilitation | AIfacilitator',
    description: 'Learn how teams can use AI to structure workshops, guide discussions, capture decisions and turn meetings into outcomes.',
    keywords: 'how to use AI for workshop facilitation, AI facilitator guide, workshop AI tools, AI meeting facilitation',
    schemaType: 'Article',
  },
  {
    route: '/blog/ai-tools-for-remote-teams',
    title: 'AI Tools for Remote Teams | AIfacilitator',
    description: 'Explore AI tools that help remote teams collaborate, facilitate workshops, run retrospectives and make better decisions.',
    keywords: 'AI tools for remote teams, remote collaboration AI, AI workshop software, remote team facilitation',
    schemaType: 'Article',
  },
  {
    route: '/privacy',
    title: 'Privacy Policy | AIfacilitator',
    description: 'Read the AIfacilitator privacy policy and learn how user, team and workshop data is handled.',
    keywords: 'AIfacilitator privacy policy, AI workshop data privacy, facilitation software privacy',
    schemaType: 'WebPage',
  },
  {
    route: '/terms',
    title: 'Terms of Service | AIfacilitator',
    description: 'Read the AIfacilitator terms of service for using the AI workshop facilitation platform.',
    keywords: 'AIfacilitator terms, AI facilitation software terms, workshop platform terms of service',
    schemaType: 'WebPage',
  },
];

const escapeAttr = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const escapeJson = (value) => String(value).replaceAll('</script', '<\\/script');

function renderStaticFallback(page) {
  if (!page.staticContent) return '';

  const { h1, intro, sections = [], cta } = page.staticContent;
  const sectionHtml = sections.map((section) => `        <section>\n          <h2>${escapeAttr(section.h2)}</h2>\n          <p>${escapeAttr(section.body)}</p>\n        </section>`).join('\n');

  return `\n    <noscript>\n      <main id="static-seo-content">\n        <h1>${escapeAttr(h1)}</h1>\n        <p>${escapeAttr(intro)}</p>\n${sectionHtml}\n        <p><strong>${escapeAttr(cta)}</strong></p>\n      </main>\n    </noscript>`;
}

function replaceMeta(html, page) {
  const url = `${site}${page.route === '/' ? '/' : page.route}`;
  const title = escapeAttr(page.title);
  const description = escapeAttr(page.description);
  const keywords = escapeAttr(page.keywords);
  const canonical = escapeAttr(url);
  const schema = {
    '@context': 'https://schema.org',
    '@type': page.schemaType,
    name: page.title,
    headline: page.title,
    description: page.description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: 'AIfacilitator',
      url: site,
    },
    publisher: {
      '@type': 'Organization',
      name: 'AIfacilitator',
      url: site,
      logo: `${site}/apple-touch-icon.png`,
    },
  };

  let updated = html
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="title" content="[^"]*"\s*\/?>/, `<meta name="title" content="${title}" />`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${description}" />`)
    .replace(/<meta name="keywords" content="[^"]*"\s*\/?>/, `<meta name="keywords" content="${keywords}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${title}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${description}" />`)
    .replace(/<meta property="og:image:alt" content="[^"]*"\s*\/?>/, `<meta property="og:image:alt" content="${title}" />`)
    .replace(/<meta name="twitter:url" content="[^"]*"\s*\/?>/, `<meta name="twitter:url" content="${canonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${title}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${description}" />`)
    .replace(/<meta name="twitter:image:alt" content="[^"]*"\s*\/?>/, `<meta name="twitter:image:alt" content="${title}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${canonical}" />`);

  const marker = '    <!-- Structured Data (JSON-LD) - Schema.org / AEO-optimised -->';
  const routeSchema = `    <script type="application/ld+json" data-static-route-schema>\n    ${escapeJson(JSON.stringify(schema, null, 2)).split('\n').join('\n    ')}\n    </script>`;
  updated = updated.replace(marker, `${routeSchema}\n${marker}`);

  const fallback = renderStaticFallback(page);
  if (fallback) {
    updated = updated.replace('</body>', `${fallback}\n  </body>`);
  }

  return updated;
}

function outputPathForRoute(route) {
  if (route === '/') return indexPath;
  return path.join(distDir, route.replace(/^\//, ''), 'index.html');
}

for (const page of pages) {
  const outputPath = outputPathForRoute(page.route);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, replaceMeta(baseHtml, page), 'utf8');
  console.log(`Generated SEO HTML for ${page.route} -> ${path.relative(process.cwd(), outputPath)}`);
}
