package com.heapland.commons.constants

object AppSettings {

  def getBinDir(root: String): String = s"$root/heapland/bin"
  val sparkCDN = "https://packages.heapland.com/spark"
  val kakfaCDN = "https://packages.heapland.com/kafka"
  val hadoopCDN = "https://packages.heapland.com/hadoop"

}
