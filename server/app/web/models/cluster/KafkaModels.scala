package web.models.cluster

import com.heapland.commons.models.ClusterStatus.ClusterStatus
import com.heapland.commons.models.{ClusterStatus, RunStatus}
import com.heapland.services.streaming.{ConsumerGroupInfo, ConsumerMember, PartitionDetails, TopicConfiguration, TopicDetails, TopicMessage}
import web.models.cloud.ClusterProcess
import web.utils.MetricConverter
import play.api.libs.json.Json



case class KafkaConfigurationRequest(name: String,
                                     version: String,
                                     scalaVersion: String,
                                     configParams: Seq[String],
                                     username: String,
                                     privateKey: Option[String] = None,
                                     hosts: Seq[String],
                                     isLocal: Boolean = true)
case class KafkaClusterMetric(totalMem: Long, cpuCores: Int, properties: Map[String, String])
case class KafkaClusterInfo(id: Long,
                            name: String,
                            service: String,
                            version: String,
                            scalaVersion: String,
                            status: ClusterStatus,
                            processes: Seq[ClusterProcess],
                            metrics: KafkaClusterMetric =
                              KafkaClusterMetric(MetricConverter.getRam, Runtime.getRuntime.availableProcessors(), Map()),
                            statusDetail: Option[String] = None)

case class KafkaNode(id: String, host: String, port: Int, rack: String)
case class TopicConfig(name: String, partitions: Int, replicationFactor: Short)

object KafkaProcesses {
  val KAFKA_SERVER = "Kafka"
  val ZOOKEEPER    = "Zookeeper"
}

case class FilterTopicMessage(maxResults: Int, startingFrom: String)
case class ReplicaDetails(broker: Int, leader: Boolean, in_sync: Boolean)

trait KafkaClusterJsonFormatter {

  implicit val runStatusFmt           = Json.formatEnum(RunStatus)
  implicit val clusterStatusFmt       = Json.formatEnum(ClusterStatus)
  implicit val kafkaConfigRequestFmt  = Json.format[KafkaConfigurationRequest]
  implicit val clusterProcessFmt      = Json.format[ClusterProcess]
  implicit val clusterMetricFmt       = Json.format[KafkaClusterMetric]
  implicit val kafkaClusterInfoFmt    = Json.format[KafkaClusterInfo]
  implicit val kafkaNodeFmt           = Json.format[KafkaNode]
  implicit val topicConfigFmt         = Json.format[TopicConfig]
  implicit val jsonFormatTopicDetails = Json.format[TopicDetails]
  implicit val jsonPartition          = Json.format[PartitionDetails]
  implicit val jsontopicMessage       = Json.format[TopicMessage]
  implicit val jsonTopicConfiguration = Json.format[TopicConfiguration]
  implicit val jsonConsumerFmt        = Json.format[ConsumerMember]
  implicit val jsonConsumerGroupInfo  = Json.format[ConsumerGroupInfo]
  implicit val jsonFetchTopicMessageFmt = Json.format[FilterTopicMessage]

}
