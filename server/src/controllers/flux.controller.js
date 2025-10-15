const Replicate = require("replicate")
const replicate = new Replicate();

const runFluxKonect = async (req, res) => {

try {

    const prompt = req.body.prompt
    const imageUrl = req.body.imageUrl

    if (!prompt) {
      return res.status(400).json({ result: "No prompt or image provided" });
    }
    const input = {
      prompt: prompt,
      guidance: 2.5,
      speed_mode: "Real Time",
      img_cond_path: imageUrl
    };

    const output = await replicate.run(`${process.env.REPLICATE_MODEL_VERSION}`, { input });

    console.log(output.url());

    res.json({ result: output.url() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ result: "Error running Flux Konect model" });
  }
};


module.exports = {
  runFluxKonect
};
