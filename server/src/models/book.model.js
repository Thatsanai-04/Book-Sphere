const mongoose = require("mongoose");

const { Schema } = mongoose;

const contributorSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    role: {
      type: String,
      required: true,
      enum: ["author", "translator", "narrator", "editor", "illustrator"],
    },
  },
  { _id: false }
);

const audioSchema = new Schema(
  {
    durationSec: { type: Number, required: true, min: 1 },
    // Keep a neutral default so catalogue creation does not depend on an external language override.
    language: { type: String, required: true, default: "en", trim: true, maxlength: 10 },
    narratorIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    files: [
      {
        chapterNo: { type: Number, required: true, min: 1 },
        title: { type: String, trim: true, maxlength: 200 },
        url: { type: String, required: true, trim: true },
        durationSec: { type: Number, required: true, min: 1 },
      },
    ],
  },
  { _id: false }
);

const bookSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    synopsis: { type: String, required: true, trim: true, maxlength: 10_000 },
    coverUrl: { type: String, trim: true },
    format: {
      type: String,
      required: true,
      enum: ["ebook", "audiobook", "ebook_and_audiobook"],
    },
    contentType: {
      type: String,
      required: true,
      enum: ["novel", "comic", "magazine", "newspaper"],
      index: true,
    },
    publisher: {
      name: { type: String, trim: true, maxlength: 150 },
      type: { type: String, enum: ["publisher", "independent"], default: "independent" },
    },
    ebook: {
      fileUrl: { type: String, trim: true, select: false },
      pageCount: { type: Number, min: 1 },
      previewUrl: { type: String, trim: true },
      contentHtml: { type: String, select: false, maxlength: 2_000_000 },
    },
    audio: audioSchema,
    language: { type: String, required: true, trim: true, maxlength: 10 },
    origin: {
      type: String,
      required: true,
      enum: ["original", "translated"],
    },
    originalLanguage: { type: String, trim: true, maxlength: 10 },
    originalTitle: { type: String, trim: true, maxlength: 300 },
    translationRights: {
      licensor: { type: String, trim: true, maxlength: 200 },
      expiresAt: { type: Date },
    },
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true },
    contributors: {
      type: [contributorSchema],
      required: true,
      validate: [(items) => items.some((item) => item.role === "author"), "At least one author is required"],
    },
    categories: [{ type: String, trim: true, lowercase: true, maxlength: 50 }],
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 50 }],
    isRecommended: { type: Boolean, default: false, index: true },
    readCount: { type: Number, default: 0, min: 0 },
    salesCount: { type: Number, default: 0, min: 0 },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },
    price: {
      amount: { type: Number, required: true, min: 0 },
      currency: { type: String, required: true, uppercase: true, trim: true, minlength: 3, maxlength: 3 },
    },
    isFree: { type: Boolean, default: false, index: true },
    buffetEligible: { type: Boolean, default: false },
    buffetAvailableFrom: { type: Date },
    buffetAvailableUntil: { type: Date },
    status: {
      type: String,
      enum: ["draft", "pending_review", "published", "unpublished"],
      default: "draft",
    },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

bookSchema.index({ status: 1, contentType: 1, isFree: 1, publishedAt: -1 });
bookSchema.index({ status: 1, buffetEligible: 1, buffetAvailableFrom: 1, buffetAvailableUntil: 1 });
bookSchema.index({ status: 1, isRecommended: -1, readCount: -1, salesCount: -1, publishedAt: -1 });
bookSchema.index({ seller: 1, status: 1 });
bookSchema.index({ title: "text", synopsis: "text", categories: "text", tags: "text" });

bookSchema.pre("validate", function validateBook() {
  const hasEbook = this.format === "ebook" || this.format === "ebook_and_audiobook";
  const hasAudio = this.format === "audiobook" || this.format === "ebook_and_audiobook";

  if (hasEbook && !this.ebook?.fileUrl) this.invalidate("ebook.fileUrl", "An e-book file is required");
  if (hasAudio && !this.audio) this.invalidate("audio", "Audio details are required");
  if (this.origin === "translated" && (!this.originalLanguage || !this.originalTitle)) {
    this.invalidate("originalTitle", "Original title and language are required for translated books");
  }
  if (this.buffetAvailableUntil && this.buffetAvailableFrom && this.buffetAvailableUntil <= this.buffetAvailableFrom) {
    this.invalidate("buffetAvailableUntil", "The end date must be after the start date");
  }
  if (this.isFree && this.price?.amount !== 0) this.invalidate("price.amount", "Free books must have a zero price");
});

module.exports = mongoose.model("Book", bookSchema);
