package com.heapland.services.streaming

case class PartitionDetails(id: Int, startingOffset: Long, endingOffset: Long, messages: Long, replicas: Seq[Int])
case class TopicConfiguration(config: String, value: String, `type`: String, source: String)
case class TopicMessage(key: String, message: String, offset: Long, timestamp: Long, partition: Int)
case class TopicDetails(name: String, partitions: Seq[Int], replications: Seq[Int], messages: Long, size: Long)
case class ConsumerMember(assignedMember: String, partition: Int, topicPartitionOffset: Long, consumedOffset: Long)
case class ConsumerGroupInfo(id: String, coordinator: Int, lag: Long, state: String, members: Seq[ConsumerMember])
object OffsetPostion {
  val LATEST = "latest"
  val BEGINNING = "beginning"
}
