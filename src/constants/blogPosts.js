export const BLOG_POSTS = [
  {
    slug: "how-to-merge-pdf-without-upload",
    title: "How to Merge PDFs Without Uploading",
    description: "A privacy-first guide to merging PDFs locally in your browser with zero uploads.",
    date: "2026-05-15",
    readingTime: "4 min read",
    sections: [
      {
        heading: "Why local merging matters",
        body: "Most PDF tools upload files to servers. Local merging keeps sensitive documents private and avoids upload delays.",
      },
      {
        heading: "Step-by-step merge process",
        body: "Add files, reorder them, and click merge. The output downloads instantly because everything runs in your browser.",
      },
      {
        heading: "Who benefits most",
        body: "Students, freelancers, and teams handling contracts or invoices benefit from local processing.",
      },
    ],
  },
  {
    slug: "best-free-pdf-tools-for-students",
    title: "Best Free PDF Tools for Students",
    description: "A quick list of free, privacy-first PDF tools that help students study and submit work.",
    date: "2026-05-15",
    readingTime: "5 min read",
    sections: [
      {
        heading: "Merge and split for assignments",
        body: "Combine notes into one PDF or split large PDFs into smaller sections for each class.",
      },
      {
        heading: "Compress for email and portals",
        body: "Reduce file size before submitting to school portals or sending over email.",
      },
      {
        heading: "Number pages for clarity",
        body: "Add page numbers to reports and projects for better structure and grading.",
      },
    ],
  },
  {
    slug: "compress-pdf-for-email",
    title: "How to Compress a PDF for Email",
    description: "Reduce PDF size to fit email limits without losing readability.",
    date: "2026-05-15",
    readingTime: "4 min read",
    sections: [
      {
        heading: "Why email limits cause problems",
        body: "Many inboxes reject attachments over 10 to 25 MB. Compression solves that quickly.",
      },
      {
        heading: "Fast compression workflow",
        body: "Upload is not required. Drag in your PDF, compress locally, and send the smaller file.",
      },
      {
        heading: "Quality tips",
        body: "Keep text sharp by avoiding extreme compression, especially for scanned documents.",
      },
    ],
  },
];

export function getBlogPost(slug) {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
