import express from "express"
import settingsModal from "../../models/Settings.js"
const router = express.Router()


router.get("/api/settings", async (req, res) => {
    try {
        let settings = await settingsModal.findOne({}, { studioName: 1, email: 1, _id: 1 })
        if (!settings) {
            settings = await settingsModal.create({ studioName: "Capture Studio", email: "hello@capturestudio.com" })
        }
        res.status(200).json({ msg: "All settings fetched successfully", data: settings })
    } catch (error) {
        console.error(error.message)
        res.status(500).json({ msg: "Internal Server Error" })
    }
})

router.patch("/api/settings", async (req, res) => {
    try {
        let updates = { ...req.body }
        delete updates._id
        delete updates.id
        const updatedSettings = await settingsModal.findOneAndUpdate(
            {},
            { $set: updates },
            { returnDocument: "after", upsert: true, runValidators: true }
        )

        return res.status(200).json({ msg: "Settings updated Successfully", data: updatedSettings })
    } catch (error) {
        console.error(error.message)
        res.status(500).json({ msg: "Internal Server Error" })
    }
})

export default router