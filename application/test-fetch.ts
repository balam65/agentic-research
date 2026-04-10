import dns from "node:dns";
dns.setDefaultResultOrder('ipv4first');
fetch("https://openrouter.ai/api/v1/chat/completions")
  .then(res => res.status)
  .then(console.log)
  .catch(console.error);
