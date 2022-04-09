package com.heapland.services.fs

case class FileListing(name: String, isDirectory: Boolean, size: Option[Long], lastModified: Long, owner: Option[String])
case class FileListingResult(hasMore: Boolean, files: List[FileListing], marker: Option[String], fsName: String = "", provider: String = "")
case class FileSummary(owner: String, lastModified: Long, size: Long, fileType: String, objectUrl: String, etag: Option[String] = None)
case class FailedFileListing(name: String, provider: String, error: String)
