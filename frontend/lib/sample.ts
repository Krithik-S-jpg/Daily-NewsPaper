import type { Edition } from "./types";
// Historical, attributable demonstration content. Never inserted into user editions.
export const sample: Edition = {
  id: "sample-001",
  date: "2022-07-12",
  title: "The discovery edition",
  sample: true,
  articles: [
    {
      id: "webb",
      headline: "A new window into the universe",
      summary:
        "The first full-color images from the James Webb Space Telescope reveal a universe of extraordinary detail. From stellar nurseries to distant galaxies, the observations open a new chapter in infrared astronomy.",
      category: "Science & discovery",
      source: "NASA",
      url: "https://www.nasa.gov/news-release/nasa-reveals-webb-telescopes-first-images-of-unseen-universe/",
      published_at: "2022-07-12",
      image: "/webb.jpg",
      video: "/cosmic-preview.webm",
      video_caption:
        "Bonus video (2024): Hubble/Webb comparison · NASA, ESA, CSA, STScI. Silent preview.",
      image_caption:
        "The Cosmic Cliffs in the Carina Nebula. NASA, ESA, CSA, and STScI.",
    },
    {
      id: "webb-science",
      image: "/infrared.jpg",
      image_caption:
        "Two infrared views of the Cosmic Cliffs · NASA, ESA, CSA, STScI.",
      headline: "Beyond the visible, a different view of the cosmos",
      summary:
        "Webb observes primarily in infrared light. These wavelengths help astronomers peer through dust and study the light from distant objects. Its first images include the Southern Ring Nebula and Stephan’s Quintet.",
      category: "The big picture",
      source: "NASA",
      url: "https://science.nasa.gov/mission/webb/",
      published_at: null,
    },
    {
      id: "python",
      headline: "The language that makes room for curiosity",
      summary:
        "Python’s official tutorial introduces a language built around readable syntax and practical tools. Explore its data structures, modules, and approaches to solving everyday programming problems.",
      category: "Programming",
      source: "Python documentation",
      url: "https://docs.python.org/3/tutorial/",
      published_at: null,
    },
    {
      id: "open-source",
      headline: "Good software starts with an open conversation",
      summary:
        "GitHub’s Open Source Guides offer practical advice for contributing to projects, building welcoming communities, and maintaining healthy collaboration. A useful starting point for your next contribution.",
      category: "Open source",
      source: "GitHub Open Source Guides",
      url: "https://opensource.guide/how-to-contribute/",
      published_at: null,
    },
    {
      id: "earth",
      image: "/earth.jpg",
      image_caption:
        "Blue Marble (2002), a composite of satellite observations · NASA Earth Observatory.",
      headline: "A little perspective on our shared planet",
      summary:
        "NASA’s Earth Observatory explores our planet through satellite imagery and scientific context. Its image collections make patterns in oceans, landscapes, and the atmosphere visible at a planetary scale.",
      category: "Our world",
      source: "NASA Earth Observatory",
      url: "https://earthobservatory.nasa.gov/",
      published_at: null,
    },
    {
      id: "web",
      headline: "The web is for everyone. Keep building it that way.",
      summary:
        "The W3C’s accessibility introduction explains how accessible design benefits people with diverse abilities. It covers the essential roles of web content, browsers, and authoring tools.",
      category: "Ideas & culture",
      source: "W3C",
      url: "https://www.w3.org/WAI/fundamentals/accessibility-intro/",
      published_at: null,
    },
  ],
};
