package com.heapland.aws

import java.io.File

import com.amazonaws.auth.{AWSStaticCredentialsProvider, BasicAWSCredentials}
import com.amazonaws.services.s3.model.ListObjectsV2Request
import com.amazonaws.services.s3.{AmazonS3, AmazonS3ClientBuilder}
import com.heapland.services.fs.FileSummary
import com.heapland.services.AWSS3Connection
import com.amazonaws.services.s3.model.ObjectMetadata
import com.amazonaws.services.s3.model.PutObjectRequest
import java.io.ByteArrayInputStream
import java.io.InputStream

import com.heapland.services.{AWSS3Connection, DataServiceProvider}
import com.heapland.services.fs.{FileListing, FileListingResult, FileSummary}

import scala.jdk.CollectionConverters._
import scala.util.Try

object S3DataService extends DataServiceProvider[AWSS3Connection] {

  def usingS3Client[T](config: AWSS3Connection)(clientFn: AmazonS3 => T): Try[T] = {
    val credentials = new BasicAWSCredentials(config.awsKey, config.awsSecretKey)
    val s3 = AmazonS3ClientBuilder
      .standard()
      .withCredentials(new AWSStaticCredentialsProvider(credentials))
      .withRegion(config.region)
      .build()
    Try(clientFn(s3))

  }

  override def isValidConfig(config: AWSS3Connection): Try[Boolean] = {
    usingS3Client(config) { s3 =>
      s3.doesBucketExistV2(config.bucket)
    }
  }

  /**
    * Deletes the file using the given path
    * @param config
    * @param path
    * @return
    */
  override def deleteFile(config: AWSS3Connection, path: String): Try[Boolean] = {
    usingS3Client(config) { s3 =>
      s3.deleteObject(config.bucket, path)
      !s3.doesObjectExist(config.bucket, path)
    }
  }

  /**
    * Using s3 client, it uploads the file and returns the version
    * @param config
    * @param path
    * @param file
    * @return
    */
  override def uploadFile(config: AWSS3Connection, path: String, file: File): Try[String] = {
    usingS3Client(config) { s3 =>
      val key  = if(path == "/"){
        file.getName
      } else {
        s"${path}${file.getName}"
      }
      s3.putObject(config.bucket, key, file).getVersionId
    }
  }

  private def getObjectName(key: String, isDirectory: Boolean): String = {
    if(isDirectory){
      key
    } else {
      key.substring(key.lastIndexOf('/') + 1)
    }
  }

  override def listFileItems(config: AWSS3Connection, path: Option[String], marker: Option[String]): Try[FileListingResult] = {
    usingS3Client(config) { s3 =>
      val request = path match {
        case None        => new ListObjectsV2Request().withBucketName(config.bucket).withDelimiter("/")
        case Some(value) => new ListObjectsV2Request().withBucketName(config.bucket).withPrefix(value).withDelimiter("/")
      }

      val result = if (marker.isDefined) s3.listObjectsV2(request.withContinuationToken(marker.get)) else s3.listObjectsV2(request)
      val directories = result.getCommonPrefixes.asScala
        .toList
        .filter(p => !p.equals(path.getOrElse("")))
        .map(s => FileListing(s.substring(path.map(_.length).getOrElse(0)), true, Some(0), 0, None))

        val files = result.getObjectSummaries
          .asScala
          .toList
            .filter(p => !p.getKey.equals(path.getOrElse("")))
        .map(s => FileListing(name = getObjectName(s.getKey, s.getKey.endsWith("/")), s.getKey.endsWith("/"), Some(s.getSize),
          s.getLastModified.toInstant.getEpochSecond, Option(s.getOwner).map(_.getId) ))
      val nextMarker = if (result.getNextContinuationToken != null) Some(result.getNextContinuationToken) else None
      FileListingResult(hasMore = result.isTruncated, files ++ directories, nextMarker)
    }
  }

  override def getFileSummary(config: AWSS3Connection, path: String): Try[FileSummary] = usingS3Client(config) { s3 =>
    val metaData = s3.getObjectMetadata(config.bucket, path)
    val props = metaData.getUserMetadata
    FileSummary(owner = "",
      lastModified = metaData.getLastModified.getTime,
      size = metaData.getContentLength,
      fileType = metaData.getContentType,
      etag = Some(metaData.getETag),
      objectUrl = s"https://${config.bucket}.s3.${config.region}.amazonaws.com/${path}")
  }

  override def createDirectory(config: AWSS3Connection, path: String): Try[Boolean] = usingS3Client(config) { s3 =>

    val metadata = new ObjectMetadata
    metadata.setContentLength(0L)
    val inputStream = new ByteArrayInputStream(new Array[Byte](0))
    val putObjectRequest = new PutObjectRequest(config.bucket, path, inputStream, metadata)
    s3.putObject(putObjectRequest)
    s3.doesObjectExist(config.bucket, path)
  }
}
