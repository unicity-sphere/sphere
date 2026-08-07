import { configure } from '@testing-library/dom';

// Testing Library's default async timeout is 1s, measured in wall-clock time
// while the whole suite runs in parallel. Under a full run (100+ files, jsdom
// environments starting concurrently) a screen transition can legitimately
// take longer than that, which surfaces as a test failing in CI and passing
// in isolation — the shape of every "flaky" report this suite has produced.
//
// Raised here rather than in each `waitFor` call: importPassword.test.tsx
// alone has 18 of them, and the next file to be added would repeat the same
// mistake. A slow assertion still fails, just not because the machine was busy.
configure({ asyncUtilTimeout: 5000 });
