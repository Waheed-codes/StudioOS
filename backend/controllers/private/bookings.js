import express from "express"
import mongoose from "mongoose"
import bookingModel from "../../models/Bookings.js"

const router = express.Router()

router.get("/api/get-all-bookings", async (req, res) => {
    try {
        let allBookings = await bookingModel.find()
            .populate("client_id", "name email phoneNumber")
            .populate("photographer_id", "name role email")

        if (allBookings.length === 0) {
            return res.status(200).json({ msg: "There are no Bookings at the moment", data: [] })
        }
        return res.status(200).json({ msg: "All Bookings fetched Sucessfully", data: allBookings })

    } catch (error) {
        console.error(error.message)
        return res.status(500).json({ msg: "Internal Server Error" })
    }
})

//create booking
router.post("/api/create-booking", async (req, res) => {
    try {
        const {
            client_id, clientId, photographer_id, photographerId, shootType, date,
            startTime, endTime, location, totalAmount,
            amountPaid, status, notes
        } = req.body;

        const effectiveClientId = client_id || clientId;
        const effectivePhotographerId = photographer_id || photographerId;

        if (!effectiveClientId || !mongoose.Types.ObjectId.isValid(effectiveClientId)) {
            return res.status(400).json({ msg: "A valid client must be selected" });
        }

        if (!effectivePhotographerId || !mongoose.Types.ObjectId.isValid(effectivePhotographerId)) {
            return res.status(400).json({ msg: "A valid photographer must be selected" });
        }

        const create = await bookingModel.create({
            client_id: effectiveClientId,
            photographer_id: effectivePhotographerId,
            shootType: shootType || "Portrait",
            date,
            startTime,
            endTime,
            location: location || "",
            totalAmount: Number(totalAmount) || 0,
            amountPaid: Number(amountPaid) || 0,
            status: status || "Confirmed",
            notes: notes || ""
        });

        return res.status(201).json({
            msg: "Booking created successfully",
            data: create
        });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            msg: "Internal Server Error"
        });
    }
});

// update-booking
router.patch("/api/update-booking/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ msg: "Invalid Booking ID format" });
        }

        const booking = await bookingModel.findById(id);

        if (!booking) {
            return res.status(404).json({
                msg: "Booking not found"
            });
        }

        const updates = { ...req.body };
        delete updates._id;
        delete updates.id;

        if (updates.clientId) {
            if (!mongoose.Types.ObjectId.isValid(updates.clientId)) {
                return res.status(400).json({ msg: "Invalid Client ID format" });
            }
            updates.client_id = updates.clientId;
            delete updates.clientId;
        }
        if (updates.photographerId) {
            if (!mongoose.Types.ObjectId.isValid(updates.photographerId)) {
                return res.status(400).json({ msg: "Invalid Photographer ID format" });
            }
            updates.photographer_id = updates.photographerId;
            delete updates.photographerId;
        }
        if (updates.totalAmount !== undefined) updates.totalAmount = Number(updates.totalAmount);
        if (updates.amountPaid !== undefined) updates.amountPaid = Number(updates.amountPaid);

        const operation = await bookingModel.findByIdAndUpdate(
            id,
            { $set: updates },
            { returnDocument: "after", runValidators: true }
        );

        return res.status(200).json({
            msg: "Booking updated successfully",
            data: operation
        });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            msg: "Internal Server Error"
        });
    }
});

//Delete Booking
router.patch("/api/delete-booking/:id", async (req, res) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ msg: "Invalid Booking ID format" });
        }

        const booking = await bookingModel.findById(id);

        if (!booking) {
            return res.status(404).json({
                msg: "Booking not found"
            });
        }

        if (booking.status === "Cancelled") {
            return res.status(400).json({
                msg: "Booking is already cancelled"
            });
        }

        booking.status = "Cancelled";
        await booking.save();

        return res.status(200).json({
            msg: "Booking cancelled successfully"
        });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            msg: "Internal Server Error"
        });
    }
});

export default router